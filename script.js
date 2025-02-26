// URL do Cloudflare Worker (substitua pelo URL do seu Worker)
const WORKER_URL = "https://codeapi-pay.ofc-rede.workers.dev";

// Função genérica para fazer requisições ao Worker
async function fetchFromWorker(endpoint, method = "GET", body = null, headers = {}) {
  try {
    const response = await fetch(`${WORKER_URL}/api${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      throw new Error("Erro na requisição.");
    }

    return await response.json();
  } catch (error) {
    alert(error.message);
    return null;
  }
}

// Função para registrar um novo usuário
async function registerUser(email, efipayApiKey, efipayApiSecret) {
  const data = await fetchFromWorker("/users/register", "POST", {
    email,
    efipay_api_key: efipayApiKey,
    efipay_api_secret: efipayApiSecret,
  });

  if (data) {
    alert("Registro realizado com sucesso!");
    window.location.href = "login.html"; // Redireciona para a página de login
  }
}

// Função para autenticar um usuário
async function loginUser(email) {
  const data = await fetchFromWorker("/users/login", "POST", { email });

  if (data) {
    alert("Login realizado com sucesso!");
    localStorage.setItem("token", data.token); // Armazena o token no navegador
    window.location.href = "dashboard.html"; // Redireciona para o dashboard
  }
}

// Função para listar planos
async function getPlans() {
  const data = await fetchFromWorker("/users/plans");

  if (data) {
    displayPlans(data);
  }
}

// Exibe os planos na página
function displayPlans(plans) {
  const planList = document.querySelector(".plan-list");
  planList.innerHTML = ""; // Limpa a lista atual

  plans.forEach((plan) => {
    const planCard = document.createElement("div");
    planCard.classList.add("plan-card");

    planCard.innerHTML = `
      <h3>${plan.name}</h3>
      <p>R$ ${plan.price.toFixed(2)}/mês</p>
      <ul>
        <li>${plan.requests_limit ? `${plan.requests_limit} requisições mensais` : "Sem limite de requisições"}</li>
      </ul>
      ${
        plan.qr_code_url
          ? `<img src="${plan.qr_code_url}" alt="QR Code ${plan.name}" style="max-width: 150px;">`
          : ""
      }
      <button class="cta-button">Comprar</button>
    `;

    planList.appendChild(planCard);
  });
}

// Função para obter informações do usuário
async function getUserInfo() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Você precisa estar logado para acessar o painel.");
    window.location.href = "login.html";
    return;
  }

  const data = await fetchFromWorker("/users/me", "GET", null, {
    Authorization: `Bearer ${token}`,
  });

  if (data) {
    displayUserInfo(data);
  }
}

// Exibe as informações do usuário na dashboard
function displayUserInfo(user) {
  document.getElementById("user-email").textContent = user.email;
  document.getElementById("user-plan").textContent = user.plan;
  document.getElementById("requests-remaining").textContent = user.requests_remaining;

  // Calcula os dias restantes para renovação
  const renewalDate = new Date(user.renewal_date);
  const today = new Date();
  const daysRemaining = Math.max(Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24)), 0);
  document.getElementById("days-remaining").textContent = `${daysRemaining} dias`;

  // Exibe as credenciais da EFIPAY
  document.getElementById("efipay-api-key").textContent = user.efipay_api_key;
  document.getElementById("efipay-api-secret").textContent = user.efipay_api_secret;

  // Atualiza as barras de progresso
  const requestsBar = document.getElementById("requests-bar");
  const daysBar = document.getElementById("days-bar");

  requestsBar.style.width = `${(user.requests_remaining / 1000) * 100}%`; // Ajuste conforme o limite do plano
  daysBar.style.width = `${(daysRemaining / 30) * 100}%`;
}

// Inicializa as funções ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  // Carrega os planos na página de planos
  if (window.location.pathname.includes("plans.html")) {
    getPlans();
  }

  // Registro de usuário
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const efipayApiKey = document.getElementById("efipay_api_key").value;
      const efipayApiSecret = document.getElementById("efipay_api_secret").value;
      await registerUser(email, efipayApiKey, efipayApiSecret);
    });
  }

  // Login de usuário
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      await loginUser(email);
    });
  }

  // Carrega informações do usuário na dashboard
  if (window.location.pathname.includes("dashboard.html")) {
    getUserInfo();
  }
});
