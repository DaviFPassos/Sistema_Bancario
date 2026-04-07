import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = 'http://127.0.0.1:8000'

function App() {
  const [tela, setTela] = useState('home'); // 'home', 'cadastro', 'login', 'dashboard'
  const [clienteLogado, setClienteLogado] = useState(null);
  const [saldoAtual, setSaldoAtual] = useState(0);
  const [emprestimos, setEmprestimos] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  
  const [formData, setFormData] = useState({
    titular: '', cadastro: '', endereco: '', cep: '',
    cidade: '', uf: '', senha: '', confirmar_senha: ''
  });

  const [loginData, setLoginData] = useState({
    agencia: '',
    numero_conta: '',
    senha: ''
  });

  const [transferData, setTransferData] = useState({
    agencia_destino: '',
    numero_conta_destino: '',
    valor: ''
  });

  const [mostraFormTransferencia, setMostraFormTransferencia] = useState(false);

  // ========== HANDLERS ==========
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  // ========== CADASTRO ==========
  const handleCadastro = async (e) => {
    e.preventDefault();
    
    if (formData.senha !== formData.confirmar_senha) {
      alert("❌ As senhas não coincidem!");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/clientes/cadastrar`, formData);
      alert(`🎉 Conta criada com sucesso!\n\nID: ${response.data.id}\nTitular: ${formData.titular}`);
      setTela('home');
      setFormData({
        titular: '', cadastro: '', endereco: '', cep: '',
        cidade: '', uf: '', senha: '', confirmar_senha: ''
      });
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || "Erro ao cadastrar";
      alert(`❌ ${msg}`);
    }
  };

  // ========== LOGIN ==========
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // Buscar cliente por Agência, Número da Conta e Senha
      const response = await axios.post(`${API_URL}/clientes/login`, {
        cadastro: loginData.agencia + loginData.numero_conta,
        senha: loginData.senha
      });

      if (response.data) {
        setClienteLogado(response.data);
        setSaldoAtual(response.data.saldo);
        setTela('dashboard');
        carregarDadosCliente(response.data.id);
      }
    } catch (error) {
      console.error(error);
      alert("❌ Agência, número da conta ou senha incorretos!");
    }
  };

  // ========== CARREGAR DADOS DO CLIENTE ==========
  const carregarDadosCliente = async (contaId) => {
    try {
      // Buscar empréstimos
      const empResponse = await axios.get(`${API_URL}/conta/${contaId}/emprestimos`);
      setEmprestimos(empResponse.data || []);

      // Buscar extrato
      const extResponse = await axios.get(`${API_URL}/conta/${contaId}/extrato`);
      setTransacoes(extResponse.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  // ========== LOGOUT ==========
  const handleLogout = () => {
    setClienteLogado(null);
    setSaldoAtual(0);
    setEmprestimos([]);
    setTransacoes([]);
    setLoginData({ agencia: '', numero_conta: '', senha: '' });
    setMostraFormTransferencia(false);
    setTela('home');
  };

  // ========== TRANSFERÊNCIA ==========
  const handleTransferencia = async (e) => {
    e.preventDefault();

    if (parseFloat(transferData.valor) <= 0) {
      alert("❌ O valor deve ser maior que zero!");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/transferir/${clienteLogado.id}`,
        {
          agencia_destino: transferData.agencia_destino,
          numero_conta_destino: transferData.numero_conta_destino,
          valor: parseFloat(transferData.valor)
        }
      );

      alert(`✅ ${response.data.mensagem}`);
      setSaldoAtual(response.data.novo_saldo);
      setTransferData({ agencia_destino: '', numero_conta_destino: '', valor: '' });
      setMostraFormTransferencia(false);
      carregarDadosCliente(clienteLogado.id);
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || "Erro ao fazer transferência";
      alert(`❌ ${msg}`);
    }
  };

  const handleTransferChange = (e) => {
    setTransferData({ ...transferData, [e.target.name]: e.target.value });
  };

  // ========================================
  // TELA HOME
  // ========================================
  if (tela === 'home') {
    return (
      <div className="main-container">
        <header className="bank-logo">
          <img 
            src="https://img.icons8.com/ios-filled/100/40E0D0/museum.png" 
            alt="Logo DuBom" 
            className="logo-icon"
          />
        </header>
        <p className="slogan">Seu dinheiro, do seu jeito.</p>

        <div className="cards-wrapper">
          {/* Card de Acesso */}
          <div className="action-card" onClick={() => setTela('login')}>
            <div className="card-icon-wrapper">
              <img 
                src="https://img.icons8.com/ios-filled/100/40E0D0/fingerprint.png" 
                alt="Acessar Conta" 
                className="fingerprint-custom"
              />
            </div>
            <h3>Acessar Conta</h3>
            <p>Consulte seu saldo e faça transações rápidas.</p>
          </div>

          {/* Card de Cadastro */}
          <div className="action-card highlight" onClick={() => setTela('cadastro')}>
            <div className="card-icon-wrapper">
              <img
                src="https://img.icons8.com/ios-filled/100/40E0D0/rocket.png" 
                alt="Abrir Conta" 
                className="rocketprint-custom"
              />
            </div>
            <h3>Abrir Conta</h3>
            <p>Cadastre-se agora e ganhe R$ 500 de bônus.</p>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // TELA DE LOGIN
  // ========================================
  if (tela === 'login') {
    return (
      <div className="main-container">
        <div className="form-box">
          <button className="back-btn" onClick={() => setTela('home')}>← Voltar</button>
          <h2>Acessar Minha Conta</h2>
          <form onSubmit={handleLogin}>
            <div className="row">
              <input 
                name="agencia" 
                placeholder="Agência" 
                value={loginData.agencia}
                onChange={handleLoginChange} 
                maxLength="4"
                required 
              />
              <input 
                name="numero_conta" 
                placeholder="Número da Conta" 
                value={loginData.numero_conta}
                onChange={handleLoginChange} 
                maxLength="10"
                required 
              />
            </div>
            <input 
              name="senha" 
              type="password" 
              placeholder="Senha (8 dígitos)" 
              value={loginData.senha}
              onChange={handleLoginChange}
              maxLength="8"
              required 
            />
            <button type="submit" className="submit-btn">Entrar</button>
          </form>
          <p style={{ marginTop: '20px', fontSize: '14px', color: '#000000' }}>
            Não tem conta? <span style={{ color: '#0281b7', cursor: 'pointer' }} onClick={() => setTela('cadastro')}>Cadastre-se aqui</span>
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // TELA DE CADASTRO
  // ========================================
  if (tela === 'cadastro') {
    return (
      <div className="main-container">
        <div className="form-box">
          <button className="back-btn" onClick={() => setTela('home')}>← Voltar</button>
          <h2>Abrir Nova Conta</h2>
          <form onSubmit={handleCadastro}>
            <input name="titular" placeholder="Nome Completo" value={formData.titular} onChange={handleChange} required />
            <input name="cadastro" placeholder="Cadastro (CPF ou CNPJ)" value={formData.cadastro} onChange={handleChange} maxLength="14" required />
            <input name="endereco" placeholder="Endereço" value={formData.endereco} onChange={handleChange} required />
            <div className="row">
              <input name="cep" placeholder="CEP" value={formData.cep} onChange={handleChange} maxLength="8" required />
              <input name="uf" placeholder="UF" value={formData.uf} maxLength="2" onChange={handleChange} required />
            </div>
            <input name="cidade" placeholder="Cidade" value={formData.cidade} onChange={handleChange} required />
            <input name="senha" type="password" placeholder="Senha (8 dígitos)" value={formData.senha} onChange={handleChange} maxLength="8" required />
            <input name="confirmar_senha" type="password" placeholder="Confirmar Senha" value={formData.confirmar_senha} onChange={handleChange} maxLength="8" required />
            <button type="submit" className="submit-btn">Finalizar Cadastro</button>
          </form>
        </div>
      </div>
    );
  }

  // ========================================
  // TELA DE DASHBOARD
  // ========================================
  if (tela === 'dashboard' && clienteLogado) {
    return (
      <div className="main-container">
        <div className="dashboard-container">
          {/* Header do Dashboard */}
          <div className="dashboard-header">
            <div>
              <h2>Olá, {clienteLogado.titular}! 👋</h2>
              <p style={{ color: '#666', fontSize: '14px' }}>Cadastro: {clienteLogado.cadastro}</p>
            </div>
            <button className="logout-btn" onClick={handleLogout}>Sair</button>
          </div>

          {/* Card de Saldo */}
          <div className="saldo-card">
            <p className="saldo-label">Saldo Disponível</p>
            <h1 className="saldo-valor">R$ {saldoAtual.toFixed(2)}</h1>
            {clienteLogado.limite_credito > 0 && (
              <p className="limite-info">
                + Limite disponível: R$ {clienteLogado.limite_credito.toFixed(2)}
              </p>
            )}
          </div>

          {/* Seção de Empréstimos */}
          {emprestimos.length > 0 && (
            <div className="secao">
              <h3>💰 Meus Empréstimos</h3>
              {emprestimos.map((emp, index) => (
                <div key={index} className="emprestimo-card">
                  <div className="emp-info">
                    <p><strong>Valor Contratado:</strong> R$ {emp.valor_contratado.toFixed(2)}</p>
                    <p><strong>Valor Pago:</strong> R$ {emp.valor_pago.toFixed(2)}</p>
                    <p><strong>Saldo Devedor:</strong> R$ {(emp.valor_contratado - emp.valor_pago).toFixed(2)}</p>
                    <p><strong>Taxa:</strong> {emp.taxa_juros}%</p>
                    <p><strong>Status:</strong> <span className={`status ${emp.status}`}>{emp.status}</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Seção de Transferência */}
          <div className="secao">
            <button 
              className="submit-btn" 
              onClick={() => setMostraFormTransferencia(!mostraFormTransferencia)}
              style={{ width: '100%', marginBottom: '10px' }}
            >
              {mostraFormTransferencia ? '❌ Cancelar Transferência' : '💳 Fazer Transferência'}
            </button>
            
            {mostraFormTransferencia && (
              <form onSubmit={handleTransferencia} style={{ marginBottom: '20px' }}>
                <h4>Transferir para outra conta</h4>
                <div className="row">
                  <input 
                    name="agencia_destino" 
                    placeholder="Agência destino" 
                    value={transferData.agencia_destino}
                    onChange={handleTransferChange}
                    maxLength="4"
                    required 
                  />
                  <input 
                    name="numero_conta_destino" 
                    placeholder="Número da conta" 
                    value={transferData.numero_conta_destino}
                    onChange={handleTransferChange}
                    maxLength="10"
                    required 
                  />
                </div>
                <input 
                  name="valor" 
                  type="number" 
                  placeholder="Valor (R$)" 
                  value={transferData.valor}
                  onChange={handleTransferChange}
                  step="0.01"
                  required 
                />
                <button type="submit" className="submit-btn">Confirmar Transferência</button>
              </form>
            )}
          </div>

          {/* Extrato Recente */}
          <div className="secao">
            <h3>📄 Extrato Recente</h3>
            {transacoes.length === 0 ? (
              <p style={{ color: '#999' }}>Nenhuma transação encontrada</p>
            ) : (
              <div className="transacoes-lista">
                {transacoes.slice(0, 5).map((trans, index) => {
                  const isDebito = trans.conta_origem_id === clienteLogado.id;
                  return (
                    <div key={index} className={`transacao-item ${isDebito ? 'debito' : 'credito'}`}>
                      <div>
                        <p className="trans-tipo">{isDebito ? '📤 Enviado' : '📥 Recebido'}</p>
                        <p className="trans-descricao">{trans.descricao || trans.tipo}</p>
                      </div>
                      <div className="trans-valor">
                        <p className={isDebito ? 'negativo' : 'positivo'}>
                          {isDebito ? '-' : '+'} R$ {trans.valor.toFixed(2)}
                        </p>
                        <p className="trans-data">{new Date(trans.criado_em).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default App;