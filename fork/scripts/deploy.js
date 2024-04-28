const { SwapRouter } = require('@uniswap/universal-router-sdk');
const { TradeType, Ether, Token, CurrencyAmount, Percent } = require('@uniswap/sdk-core');
const { Trade: V2Trade } = require('@uniswap/v2-sdk');
const { FeeAmount, Pool, Route: V3Route, TICK_SPACINGS, TickMath, Trade: V3Trade, nearestUsableTick } = require('@uniswap/v3-sdk');
const JSBI = require("jsbi");
const { MixedRouteTrade, Trade: RouterTrade } = require("@uniswap/router-sdk");
const IUniswapV3Pool = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json");
const erc20Abi = require('../abis__erc20.json');

const hardhat = require("hardhat");
const provider = hardhat.ethers.provider;

const ETHER = Ether.onChain(1);
const WETH = new Token(
    1,
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    18,
    "WETH",
    "Wrapped Ether"
);
const USDC = new Token(
    1,
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    6,
    "USDC",
    "USD Coin"
);

const wethContract = new hardhat.ethers.Contract(WETH.address, erc20Abi, provider);
const usdcContract = new hardhat.ethers.Contract(USDC.address, erc20Abi, provider);
const RECIPIENT = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";

async function getPool(tokenA, tokenB, feeAmount) {
    const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA];

    const poolAddress = Pool.getAddress(token0, token1, feeAmount);
    const contract = new hardhat.ethers.Contract(poolAddress, IUniswapV3Pool.abi, provider);

    let liquidity = await contract.liquidity();
    let { sqrtPriceX96, tick } = await contract.slot0();

    liquidity = JSBI.BigInt(liquidity.toString());
    sqrtPriceX96 = JSBI.BigInt(sqrtPriceX96.toString());
    console.log("\n\n\n\n\n\n\n\n\n")

    console.log("CAllinggg Pool --------------------")

    return new Pool(token0, token1, feeAmount, sqrtPriceX96, liquidity, tick, [
        {
            index: nearestUsableTick(TickMath.MIN_TICK, TICK_SPACINGS[feeAmount]),
            liquidityNet: liquidity,
            liquidityGross: liquidity,
        }, {
            index: nearestUsableTick(TickMath.MIN_TICK, TICK_SPACINGS[feeAmount]),
            liquidityNet: JSBI.multiply(liquidity, JSBI.BigInt("-1")),
            liquidityGross: liquidity,

        }
    ])


}


// swap option
function swapOptions(options) {
    return Object.assign({
        slippageTolerance: new Percent(5, 1000),
        recipient: RECIPIENT,
    },
        options
    );
}


// build trade
function buildTrade(trades) {
    return new RouterTrade({
        v2Routes: trades.filter((trade) => trade instanceof V2Trade).map(trade => ({
            routev2: trade.route,
            inputAmount: trade.inputAmount,
            outputAmount: trade.outputAmount,
        })),
        v3Routes: trades.filter((trade) => trade instanceof V3Trade).map(trade => ({
            routev3: trade.route,
            inputAmount: trade.inputAmount,
            outputAmount: trade.outputAmount,
        })),
        mixedRoutes: trades.filter((trade) => trade instanceof MixedRouteTrade).map(trade => ({
            mixedRoute: trade.route,
            inputAmount: trade.inputAmount,
            outputAmount: trade.outputAmount,
        })),
        tradeType: trades[0].tradeType,
    })
}


async function main() {
    const signer = await hardhat.ethers.getImpersonatedSigner(RECIPIENT);
    const WETH_USDC_V3 = await getPool(WETH, USDC, FeeAmount.MEDIUM);
    const inputEther = hardhat.ethers.utils.parseEther("10").toString();

    const trade = await V3Trade.fromRoute(
        new V3Route([WETH_USDC_V3], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
    )

    const routerTrade = buildTrade([trade]);
    const opts = swapOptions({});
    const params = SwapRouter.swapERC20CallParameters(routerTrade, opts)

    let ethBalance;
    let wethBalance;
    let usdcBalance;

    ethBalance = await provider.getBalance(RECIPIENT);
    wethBalance = await wethContract.balanceOf(RECIPIENT);
    usdcBalance = await usdcContract.balanceOf(RECIPIENT);


    console.log("---------------Before")
    console.log("Eth Balance: ", hardhat.ethers.utils.formatUnits(ethBalance, 18))
    console.log("wethBalance", hardhat.ethers.utils.formatUnits(wethBalance, 18))
    console.log("usdcBalance", hardhat.ethers.utils.formatUnits(usdcBalance, 6))

    const tx = await signer.sendTransaction({
        value: params.value,
        to: "0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B",
        from: RECIPIENT,
        data: params.calldata,
    })

    const receipt = await tx.wait();
    console.log("--------------Success")
    console.log(receipt.status, "Status")

    // console.log(WETH_USDC_V3, "weth_usdc_v3")
    // console.log(trade, "trade")
    // console.log(routerTrade, "routerTrade")
    // console.log(opts, "opts")
    // console.log(params, "params")


    ethBalance = await provider.getBalance(RECIPIENT);
    wethBalance = await wethContract.balanceOf(RECIPIENT);
    usdcBalance = await usdcContract.balanceOf(RECIPIENT);

    console.log("---------------After")
    console.log("Eth Balance: ", hardhat.ethers.utils.formatUnits(ethBalance, 18))
    console.log("wethBalance", hardhat.ethers.utils.formatUnits(wethBalance, 18))
    console.log("usdcBalance", hardhat.ethers.utils.formatUnits(usdcBalance, 6))
    console.log("\n\n\n\n\n\n\n\n\n\n\n\n\n")

}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e)
        process.exit(1)
    })