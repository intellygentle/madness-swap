require('dotenv').config();
const { ethers } = require('ethers');

// Configuration from .env
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz';
const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS || '0x64Aff7245EbdAAECAf266852139c67E4D8DBa4de';
if (!PRIVATE_KEY) {
  console.error('Error: Private key not found. Add PRIVATE_KEY to .env');
  process.exit(1);
}

// Swap pair addresses from .env
const PAIR_ADDRESSES = {
  'MON_USDC': process.env.PAIR_MON_USDC,
  'USDC_WETH': process.env.PAIR_USDC_WETH,
};

// Automation inputs from .env
const FROM_TOKEN = process.env.FROM_TOKEN?.toUpperCase();
const TO_TOKEN = process.env.TO_TOKEN?.toUpperCase();
const AMOUNT = parseFloat(process.env.AMOUNT);
const SLIPPAGE = parseFloat(process.env.SLIPPAGE) || 0.5;
const ITERATIONS = parseInt(process.env.ITERATIONS) || 1;
const INTERVAL = parseInt(process.env.INTERVAL) || 60;
const DRY_RUN = process.env.DRY_RUN === 'true';
const MAX_GAS_PRICE = process.env.MAX_GAS_PRICE ? ethers.utils.parseUnits(process.env.MAX_GAS_PRICE, 'gwei') : null;

// Base tokens
const BASE_TOKENS = {
  MON: { name: "MON", address: null, decimals: 18, native: true },
  WMON: { name: "WMON", address: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701", decimals: 18, native: false },
  WETH: { name: "WETH", address: "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37", decimals: 18, native: false },
  SMON: { name: "sMON", address: "0xe1d2439b75fb9746E7Bc6cB777Ae10AA7f7ef9c5", decimals: 18, native: false },
  USDT: { name: "USDT", address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D", decimals: 6, native: false },
  WBTC: { name: "WBTC", address: "0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d", decimals: 8, native: false },
  MAD: { name: "MAD", address: "0xC8527e96c3CB9522f6E35e95C0A28feAb8144f15", decimals: 18, native: false },
  USDC: { name: "USDC", address: "0xf817257fed379853cde0fa4f97ab987181b1e5ea", decimals: 6, native: false }
};

let TOKENS = { ...BASE_TOKENS };

// ABIs
const ROUTER_ABI = [
  {
    "type": "function",
    "stateMutability": "view",
    "outputs": [{"type": "address", "name": "", "internalType": "address"}],
    "name": "WETH",
    "inputs": [],
  },
  {
    "type": "function",
    "stateMutability": "view",
    "outputs": [{"type": "uint256[]", "name": "amounts", "internalType": "uint256[]"}],
    "name": "getAmountsOut",
    "inputs": [
      {"type": "uint256", "name": "amountIn", "internalType": "uint256"},
      {"type": "address[]", "name": "path", "internalType": "address[]"},
    ],
  },
  {
    "type": "function",
    "stateMutability": "payable",
    "outputs": [{"type": "uint256[]", "name": "amounts", "internalType": "uint256[]"}],
    "name": "swapExactETHForTokens",
    "inputs": [
      {"type": "uint256", "name": "amountOutMin", "internalType": "uint256"},
      {"type": "address[]", "name": "path", "internalType": "address[]"},
      {"type": "address", "name": "to", "internalType": "address"},
      {"type": "uint256", "name": "deadline", "internalType": "uint256"},
    ],
  },
  {
    "type": "function",
    "stateMutability": "nonpayable",
    "outputs": [{"type": "uint256[]", "name": "amounts", "internalType": "uint256[]"}],
    "name": "swapExactTokensForETH",
    "inputs": [
      {"type": "uint256", "name": "amountIn", "internalType": "uint256"},
      {"type": "uint256", "name": "amountOutMin", "internalType": "uint256"},
      {"type": "address[]", "name": "path", "internalType": "address[]"},
      {"type": "address", "name": "to", "internalType": "address"},
      {"type": "uint256", "name": "deadline", "internalType": "uint256"},
    ],
  },
  {
    "type": "function",
    "stateMutability": "nonpayable",
    "outputs": [{"type": "uint256[]", "name": "amounts", "internalType": "uint256[]"}],
    "name": "swapExactTokensForTokens",
    "inputs": [
      {"type": "uint256", "name": "amountIn", "internalType": "uint256"},
      {"type": "uint256", "name": "amountOutMin", "internalType": "uint256"},
      {"type": "address[]", "name": "path", "internalType": "address[]"},
      {"type": "address", "name": "to", "internalType": "address"},
      {"type": "uint256", "name": "deadline", "internalType": "uint256"},
    ],
  },
];
const TOKEN_ABI = [
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function",
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"},
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function",
  },
];

// Expanded ABI for token detection events
const ERC20_TRANSFER_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "from", "type": "address"},
      {"indexed": true, "name": "to", "type": "address"},
      {"indexed": false, "name": "value", "type": "uint256"}
    ],
    "name": "Transfer",
    "type": "event"
  }
];

// Global variables
let provider, wallet, router, walletAddress;

async function getTokenBalances() {
  const balances = {};
  const nativeBalance = await provider.getBalance(walletAddress);
  balances.MON = { symbol: 'MON', balance: ethers.utils.formatEther(nativeBalance), raw: nativeBalance, address: null, decimals: 18, native: true };

  for (const [symbol, token] of Object.entries(TOKENS)) {
    if (!token.native) {
      try {
        const tokenContract = new ethers.Contract(token.address, TOKEN_ABI, provider);
        const balance = await tokenContract.balanceOf(walletAddress);
        balances[symbol] = { symbol, balance: ethers.utils.formatUnits(balance, token.decimals), raw: balance, address: token.address, decimals: token.decimals, native: false };
      } catch (error) {
        console.error(`Error fetching ${symbol} balance:`, error.message);
        balances[symbol] = { symbol, balance: '0', raw: ethers.BigNumber.from(0), address: token.address, decimals: token.decimals, native: false };
      }
    }
  }
  return balances;
}

async function displayTokenBalances(balances) {
  console.log('\n===== Wallet Token Balances =====');
  let hasPositive = false;
  Object.entries(balances).forEach(([symbol, data]) => {
    if (parseFloat(data.balance) > 0) {
      console.log(`${symbol}: ${data.balance}`);
      hasPositive = true;
    }
  });
  if (!hasPositive) console.log('No tokens with positive balance.');
}

async function getQuote(fromToken, toToken, amount) {
  try {
    const fromTokenData = TOKENS[fromToken];
    const toTokenData = TOKENS[toToken];
    if (!fromTokenData || !toTokenData) throw new Error('Invalid token symbol');

    let path = [];
    const pairKey = `${fromToken}_${toToken}`;
    const pairAddress = PAIR_ADDRESSES[pairKey];

    if (pairAddress) {
      console.log(`Using pair contract address for ${pairKey}: ${pairAddress}`);
      path = [fromTokenData.address || TOKENS.WMON.address, toTokenData.address || TOKENS.WMON.address];
    } else {
      if (fromToken === 'MON') path = [TOKENS.WMON.address, toTokenData.address];
      else if (toToken === 'MON') path = [fromTokenData.address, TOKENS.WMON.address];
      else path = [fromTokenData.address, toTokenData.address];
    }

    const amountIn = ethers.utils.parseUnits(amount.toString(), fromTokenData.decimals);
    const amountsOut = await router.getAmountsOut(amountIn, path);
    const amountOut = ethers.utils.formatUnits(amountsOut[amountsOut.length - 1], toTokenData.decimals);

    return { fromToken, toToken, amountIn: amount, amountOut, path };
  } catch (error) {
    console.error('Error getting quote:', error.message);
    return null;
  }
}

async function approveExactAmount(tokenAddress, spenderAddress, amount, decimals) {
  const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, wallet);
  const currentAllowance = await tokenContract.allowance(walletAddress, spenderAddress);
  if (currentAllowance.lt(amount)) {
    console.log('Approving tokens...');
    const approveTx = await tokenContract.approve(spenderAddress, amount, { gasPrice: MAX_GAS_PRICE });
    await approveTx.wait();
    console.log('Tokens approved!');
  } else {
    console.log('Sufficient approval exists.');
  }
}

async function executeSwap(fromToken, toToken, amount, slippage = 0.5) {
  try {
    console.log(`\nSwapping ${amount} ${fromToken} to ${toToken}...`);
    const fromTokenData = TOKENS[fromToken];
    const toTokenData = TOKENS[toToken];
    if (!fromTokenData || !toTokenData) throw new Error('Invalid token symbols');

    const quote = await getQuote(fromToken, toToken, amount);
    if (!quote) throw new Error('Failed to get quote');
    console.log(`Quote: ${quote.amountOut} ${toToken}`);

    const amountOutBN = ethers.utils.parseUnits(quote.amountOut, toTokenData.decimals);
    const minAmountOut = amountOutBN.mul(Math.floor((100 - slippage) * 100)).div(10000);
    const deadline = Math.floor(Date.now() / 1000) + 20 * 60;

    if (DRY_RUN) {
      console.log(`[DRY RUN] Would swap ${amount} ${fromToken} for ${quote.amountOut} ${toToken} (min ${ethers.utils.formatUnits(minAmountOut, toTokenData.decimals)})`);
      return { hash: 'simulated_tx_hash', blockNumber: 'simulated' };
    }

    let tx;
    if (fromToken === 'MON') {
      const amountIn = ethers.utils.parseEther(amount.toString());
      tx = await router.swapExactETHForTokens(minAmountOut, quote.path, walletAddress, deadline, { value: amountIn, gasPrice: MAX_GAS_PRICE });
    } else if (toToken === 'MON') {
      const amountIn = ethers.utils.parseUnits(amount.toString(), fromTokenData.decimals);
      await approveExactAmount(fromTokenData.address, ROUTER_ADDRESS, amountIn, fromTokenData.decimals);
      tx = await router.swapExactTokensForETH(amountIn, minAmountOut, quote.path, walletAddress, deadline, { gasPrice: MAX_GAS_PRICE });
    } else {
      const amountIn = ethers.utils.parseUnits(amount.toString(), fromTokenData.decimals);
      await approveExactAmount(fromTokenData.address, ROUTER_ADDRESS, amountIn, fromTokenData.decimals);
      tx = await router.swapExactTokensForTokens(amountIn, minAmountOut, quote.path, walletAddress, deadline, { gasPrice: MAX_GAS_PRICE });
    }

    console.log('Swap transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Swap completed! Block:', receipt.blockNumber);
    return receipt;
  } catch (error) {
    console.error('Error executing swap:', error.message);
    return null;
  }
}

async function automatedSwap(fromToken, toToken, amount, slippage, iterations, interval) {
  for (let i = 0; i < iterations; i++) {
    try {
      await executeSwap(fromToken, toToken, amount, slippage);
      console.log(`Swap ${i + 1}/${iterations} completed.`);
      if (i < iterations - 1) {
        console.log(`Waiting ${interval} seconds...`);
        await new Promise(resolve => setTimeout(resolve, interval * 1000));
      }
    } catch (error) {
      console.error(`Error during swap ${i + 1}:`, error.message);
    }
  }
}

async function main() {
  console.log('Connecting to Monad testnet...');
  provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);
  walletAddress = wallet.address;
  console.log(`Connected with address: ${walletAddress}`);

  if (!TOKENS[FROM_TOKEN] || !TOKENS[TO_TOKEN] || FROM_TOKEN === TO_TOKEN) {
    console.error('Invalid FROM_TOKEN or TO_TOKEN in .env');
    process.exit(1);
  }
  if (isNaN(AMOUNT) || AMOUNT <= 0) {
    console.error('Invalid AMOUNT in .env');
    process.exit(1);
  }
  if (isNaN(SLIPPAGE) || SLIPPAGE < 0 || SLIPPAGE > 100) {
    console.error('Invalid SLIPPAGE in .env');
    process.exit(1);
  }
  if (isNaN(ITERATIONS) || ITERATIONS <= 0) {
    console.error('Invalid ITERATIONS in .env');
    process.exit(1);
  }
  if (isNaN(INTERVAL) || INTERVAL < 1) {
    console.error('Invalid INTERVAL in .env');
    process.exit(1);
  }

  const balances = await getTokenBalances();
  await displayTokenBalances(balances);

  console.log(`Starting swaps: ${AMOUNT} ${FROM_TOKEN} to ${TO_TOKEN}, ${ITERATIONS} times, ${INTERVAL}s interval`);
  await automatedSwap(FROM_TOKEN, TO_TOKEN, AMOUNT, SLIPPAGE, ITERATIONS, INTERVAL);

  const finalBalances = await getTokenBalances();
  await displayTokenBalances(finalBalances);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});