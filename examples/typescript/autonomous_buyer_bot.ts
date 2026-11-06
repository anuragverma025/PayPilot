/**
 * PayPilot Autonomous Agentic Procurement Bot (TypeScript Reference)
 * -------------------------------------------------------------------
 * Demonstrates an autonomous AI agent utilizing the APIMatic-ready PayPilot API
 * to query hardware, evaluate specs, and create a PayPal Sandbox order.
 */

const API_BASE_URL = process.env.PAYPILOT_API_URL || 'http://localhost:5000/api';

interface AssistantChatResponse {
  success: boolean;
  data: {
    recommendation: {
      id: string;
      name: string;
      priceINR: number;
      priceUSD: number;
      ram: { capacityGB: number; isUpgradable: boolean };
    };
    alternatives: Array<{ id: string; name: string }>;
  };
}

async function runAgentPipeline() {
  console.log('🤖 Starting PayPilot TypeScript Agentic Commerce Pipeline...');

  // 1. Submit goal to multi-turn shopping assistant
  const chatRes = await fetch(`${API_BASE_URL}/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Need 32GB RAM workstation for Docker and LLM inference under ₹1,20,000',
      sessionId: 'agent_ts_session_001'
    })
  });

  const chatData = (await chatRes.json()) as AssistantChatResponse;
  const targetLaptop = chatData.data.recommendation;
  console.log(`[Assistant Grounded Selection] ${targetLaptop.name} ($${targetLaptop.priceUSD})`);

  // 2. Stage server-authoritative PayPal Developer Sandbox Order
  const orderRes = await fetch(`${API_BASE_URL}/paypal/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: targetLaptop.id,
      quantity: 1,
      currency: 'USD',
      approvalConfirmed: true,
      buyer: {
        name: 'Autonomous Dev Bot',
        email: 'devbot@paypilot-enterprise.example'
      },
      shippingAddress: {
        recipientName: 'Dev Operations Facility',
        addressLine1: '500 Server Farm Rd',
        city: 'Austin',
        state: 'TX',
        postalCode: '78701',
        countryCode: 'US'
      }
    })
  });

  const orderData = await orderRes.json();
  console.log(`[PayPal Sandbox Order] ID: ${orderData.data?.id} Status: ${orderData.data?.status}`);
  console.log('✅ Autonomous Procurement Completed Successfully via PayPilot API');
}

runAgentPipeline().catch(console.error);
