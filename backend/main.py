from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import mysql.connector
from uuid import uuid4
from datetime import datetime
import uvicorn
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente do arquivo banckend.env
load_dotenv('backend.env')

app = FastAPI(title="Banco DuBom")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuração do Banco
db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "banco_dubom")
}

def get_db_connection():
    """Cria conexão com o banco"""
    try:
        return mysql.connector.connect(**db_config)
    except mysql.connector.Error as err:
        print(f"❌ Erro de conexão: {err}")
        raise HTTPException(status_code=500, detail="Erro ao conectar no banco de dados")

# ===== SCHEMAS =====
class ClienteCreate(BaseModel):
    titular: str
    cadastro: str
    endereco: str
    cep: str
    cidade: str
    uf: str
    senha: str
    confirmar_senha: str

class LoginRequest(BaseModel):
    cadastro: str
    senha: str

class ClienteResponse(BaseModel):
    id: int
    titular: str
    cadastro: str
    agencia: str
    numero_conta: str
    saldo: float
    limite_credito: float

class TransferenciaRequest(BaseModel):
    agencia_destino: str
    numero_conta_destino: str
    valor: float

# ===== ROTAS =====

@app.get("/")
async def root():
    """Rota de teste"""
    return {"mensagem": "API Banco DuBom rodando!", "status": "ok"}

@app.post("/clientes/cadastrar")
async def cadastrar_cliente(cliente: ClienteCreate):
    """Cadastra novo cliente (PF ou PJ)"""
    print(f"📥 Cadastro recebido: {cliente.titular}")
    
    # Limpa formatação do documento (remove pontos, traços, etc)
    doc_limpo = "".join(filter(str.isdigit, cliente.cadastro))
    
    # Validações
    if cliente.senha != cliente.confirmar_senha:
        raise HTTPException(status_code=400, detail="As senhas não coincidem")
    
    if len(cliente.senha) != 8:
        raise HTTPException(status_code=400, detail="A senha deve ter 8 dígitos")
    
    if len(doc_limpo) not in [11, 14]:
        raise HTTPException(status_code=400, detail="Documento inválido. Use 11 dígitos para CPF ou 14 para CNPJ.")
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    try:
        # Verificar se Documento (cadastro) já existe
        cursor.execute("SELECT id FROM contas WHERE cadastro = %s", (doc_limpo,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="CPF/CNPJ já cadastrado")
        
        # Inserir no banco usando a nova coluna 'cadastro'
        sql = """
            INSERT INTO contas 
            (titular, cadastro, endereco, cep, cidade, uf, saldo, senha) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        valores = (
            cliente.titular, doc_limpo, cliente.endereco, 
            cliente.cep, cliente.cidade, cliente.uf, 
            0.00, cliente.senha
        )
        
        cursor.execute(sql, valores)
        db.commit()
        
        novo_id = cursor.lastrowid
        
        # Gerar numero_conta automaticamente (ID + 1000)
        numero_conta = str(novo_id + 1000)
        cursor.execute(
            "UPDATE contas SET numero_conta = %s WHERE id = %s",
            (numero_conta, novo_id)
        )
        db.commit()
        
        print(f"✅ Cliente cadastrado! ID: {novo_id}, Conta: {numero_conta} ({'PJ' if len(doc_limpo) == 14 else 'PF'})")
        
        return {
            "sucesso": True, 
            "id": novo_id,
            "numero_conta": numero_conta,
            "mensagem": f"Conta criada para {cliente.titular}"
        }
        
    except mysql.connector.IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="CPF/CNPJ já cadastrado")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()

@app.post("/clientes/login")
async def login_cliente(req: LoginRequest) -> ClienteResponse:
    """Faz login do cliente"""
    print(f"🔐 Tentativa de login: Agência {req.cadastro[:4]} / Conta {req.cadastro[4:]}")
    
    # Separar agência e número da conta
    agencia = req.cadastro[:4]
    numero_conta = req.cadastro[4:]
    
    print(f"📋 Agência: {agencia}, Conta: {numero_conta}")
    print(f"🔑 Senha: {req.senha}")
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    try:
        # Primeiro, verifica se a conta existe
        cursor.execute("SELECT id, senha FROM contas WHERE agencia = %s AND numero_conta = %s", (agencia, numero_conta))
        conta_encontrada = cursor.fetchone()
        
        if not conta_encontrada:
            print(f"❌ Conta {agencia}/{numero_conta} não encontrada no banco")
            raise HTTPException(status_code=401, detail="Agência, número da conta ou senha incorretos")
        
        print(f"✓ Conta encontrada. Verificando senha...")
        
        # Verifica a senha
        if conta_encontrada["senha"] != req.senha:
            print(f"❌ Senha incorreta para {agencia}/{numero_conta}")
            raise HTTPException(status_code=401, detail="Agência, número da conta ou senha incorretos")
        
        # Se passou em ambas as verificações, retorna os dados do cliente
        cursor.execute(
            "SELECT id, titular, cadastro, agencia, numero_conta, saldo, limite_credito FROM contas WHERE agencia = %s AND numero_conta = %s", 
            (agencia, numero_conta)
        )
        cliente = cursor.fetchone()
        
        print(f"✅ Login bem-sucedido: {cliente['titular']} (Conta: {cliente['numero_conta']})")
        return cliente
        
    finally:
        cursor.close()
        db.close()

@app.get("/conta/{conta_id}/emprestimos")
async def buscar_emprestimos(conta_id: int):
    """Retorna empréstimos da conta"""
    print(f"💰 Buscando empréstimos da conta {conta_id}")
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    try:
        cursor.execute(
            """SELECT id, valor_contratado, valor_pago, taxa_juros, status, criado_em 
               FROM emprestimos 
               WHERE conta_id = %s 
               ORDER BY criado_em DESC""", 
            (conta_id,)
        )
        emprestimos = cursor.fetchall()
        return emprestimos
        
    finally:
        cursor.close()
        db.close()

@app.get("/conta/{conta_id}/extrato")
async def ver_extrato(conta_id: int):
    """Retorna extrato de transações"""
    print(f"📄 Buscando extrato da conta {conta_id}")
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    try:
        cursor.execute(
            """SELECT * FROM transacoes 
               WHERE conta_origem_id = %s OR conta_destino_id = %s 
               ORDER BY criado_em DESC 
               LIMIT 20""", 
            (conta_id, conta_id)
        )
        transacoes = cursor.fetchall()
        return transacoes
        
    finally:
        cursor.close()
        db.close()

@app.get("/conta/{conta_id}")
async def buscar_conta(conta_id: int) -> ClienteResponse:
    """Busca dados de uma conta"""
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    try:
        cursor.execute(
            "SELECT id, titular, cadastro, agencia, numero_conta, saldo, limite_credito FROM contas WHERE id = %s", 
            (conta_id,)
        )
        conta = cursor.fetchone()
        
        if not conta:
            raise HTTPException(status_code=404, detail="Conta não encontrada")
        
        return conta
        
    finally:
        cursor.close()
        db.close()

@app.post("/transferir/{conta_origem_id}")
async def fazer_transferencia(conta_origem_id: int, transferencia: TransferenciaRequest):
    """Faz transferência entre contas"""
    print(f"💸 Transferência solicitada: Conta {conta_origem_id} → Agência {transferencia.agencia_destino}/{transferencia.numero_conta_destino}")
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    try:
        # Verificar se a conta de origem existe e tem saldo
        cursor.execute(
            "SELECT saldo, limite_credito FROM contas WHERE id = %s", 
            (conta_origem_id,)
        )
        conta_origem = cursor.fetchone()
        
        if not conta_origem:
            raise HTTPException(status_code=404, detail="Conta de origem não encontrada")
        
        # Converter Decimal para float
        saldo_origem = float(conta_origem["saldo"])
        limite_origem = float(conta_origem["limite_credito"])
        valor_transferencia = float(transferencia.valor)
        
        saldo_disponivel = saldo_origem + limite_origem
        if valor_transferencia > saldo_disponivel:
            raise HTTPException(status_code=400, detail="Saldo insuficiente para a transferência")
        
        # Encontrar a conta de destino
        cursor.execute(
            "SELECT id, saldo FROM contas WHERE agencia = %s AND numero_conta = %s", 
            (transferencia.agencia_destino, transferencia.numero_conta_destino)
        )
        conta_destino = cursor.fetchone()
        
        if not conta_destino:
            raise HTTPException(status_code=404, detail="Conta de destino não encontrada")
        
        # Fazer a transferência
        saldo_destino = float(conta_destino["saldo"])
        novo_saldo_origem = saldo_origem - valor_transferencia
        novo_saldo_destino = saldo_destino + valor_transferencia
        
        cursor.execute("UPDATE contas SET saldo = %s WHERE id = %s", (novo_saldo_origem, conta_origem_id))
        cursor.execute("UPDATE contas SET saldo = %s WHERE id = %s", (novo_saldo_destino, conta_destino["id"]))
        
        # Registrar na tabela de transações
        transacao_id = str(uuid4())
        cursor.execute(
            """INSERT INTO transacoes 
               (uuid, conta_origem_id, conta_destino_id, valor, tipo, status) 
               VALUES (%s, %s, %s, %s, 'transferencia', 'concluido')""",
            (transacao_id, conta_origem_id, conta_destino["id"], valor_transferencia)
        )
        
        db.commit()
        print(f"✅ Transferência concluída! R$ {valor_transferencia:.2f}")
        
        return {
            "sucesso": True,
            "mensagem": f"Transferência de R$ {transferencia.valor:.2f} realizada com sucesso",
            "novo_saldo": novo_saldo_origem
        }
        
    except mysql.connector.Error as e:
        db.rollback()
        print(f"❌ Erro no banco: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        db.rollback()
        print(f"❌ Erro: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()

if __name__ == "__main__":
    print("🚀 Iniciando servidor Banco DuBom...")
    print("📝 Acesse: http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)