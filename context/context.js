import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import JSBI from "jsbi";

// external imports
import React, { useState } from 'react';
import { SwapRouter } from '@uniswap/universal-router-sdk';
import { TradeType, Ether, Token, CurrencyAmount, Percent } from '@uniswap/sdk-core';
import { Trade as V2Trade } from '@uniswap/v2-sdk';
import { FeeAmount, Pool, Route as V3Route, TICK_SPACINGS, TickMath, Trade as V3Trade, nearestUsableTick } from '@uniswap/v3-sdk';
import { MixedRouteTrade, Trade as RouterTrade } from "@uniswap/router-sdk";
import IUniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";


// internal import
import { CONNECTING_CONTRACT, ERC20_ABI, web3Provider } from './constants';
import { parseErrorMsg, shortenAddress } from '../utils';

export const CONTEXT = React.createContext();

export const PROvider = ({ children }) => {
    const TOKEN_SWAP = "TOKEN SWAP DAPP";
    const [loader, setloader] = useState(false)
    const [address, setaddress] = useState("")
    const [chainID, setchainID] = useState("")

    // notificartion
    const notifyError = (msg) => toast.error(msg, { duration: 3000 })
    const notifySuccess = (msg) => toast.success(msg, { duration: 3000 })

    // connect wallet
    const connect = async () => {
        try {
            if (!window.ethereum) return notifyError("Install metamask!")
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            })

            if (accounts.length) {
                setaddress(accounts[0]);
            } else {
                notifyError("Sorry you have no account");
            }

            const provider = await web3Provider();
            const network = await provider.getNetwork();
            setchainID(network.chainId);
        } catch (error) {
            const errMsg = parseErrorMsg(error)
            notifyError(errMsg)
            console.log(error)
        }
    }

    // load token
    const LoadToken = async (token) => {
        try {
            const tokenDetail = await CONNECTING_CONTRACT(token)
            return tokenDetail;
        } catch (error) {
            const errMsg = parseErrorMsg(error)
            notifyError(errMsg)
            console.log(error)
        }
    }

    // internal function
    async function getPool(tokenA, tokenB, feeAmount, provider) {
        const [token0, token1] = tokenA.shortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA];

        const poolAddress = Pool.getAddress(token0, token1, feeAmount);
        const contract = new ethers.Contract(poolAddress, IUniswapV3Pool, provider);

        let liquidity = await contract.liquidity();
        let { sqrtPriceX96, tick } = await contract.slot0();

        liquidity = JSBI.BigInt(liquidity.toString());
        sqrtPriceX96 = JSBI.BigInt(sqrtPriceX96.toString());

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

    // demo acount
    const RECIPIENT = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";

    // swap function
    const swap = async (token_1, token_2, swapInputAmount) => {
        try {
            console.log("callimg me _______________________SWAP");
            const _inputAmount = 1;
            const provider = await web3Provider();

            const network = await provider.getNetwork()
            // const ETHER = Ether.onChain(network.chainId)
            const ETHER = Ether.onChain(1);

            // token contract
            const tokenAddress1 = await CONNECTING_CONTRACT("")
            const tokenAddress2 = await CONNECTING_CONTRACT("")

            // token details
            const TOEKN_A = new Token(
                tokenAddress1.chainId,
                tokenAddress1.address,
                tokenAddress1.decimals,
                tokenAddress1.symbol,
                tokenAddress1.name
            )
            const TOEKN_B = new Token(
                tokenAddress2.chainId,
                tokenAddress2.address,
                tokenAddress2.decimals,
                tokenAddress2.symbol,
                tokenAddress2.name
            )

            const WETH_USDC_V3 = await getPool(TOEKN_A, TOEKN_B, FeeAmount.MEDIUM, provider)
            const inputEther = ethers.utils.parseEther("1").toString();

            const trade = await V3Trade.fromRoute(
                new V3Route([WETH_USDC_V3, ETHER, TOEKN_B]),
                CurrencyAmount.fromRawAmount(Ether, inputEther),
                TradeType.EXACT_INPUT,
            )

            const routerTrade = buildTrade([trade]);
            const opts = swapOptions({})
            const params = SwapRouter.swapCallParameters(routerTrade, opts);

            console.log(WETH_USDC_V3, "weth_usdc_v3")
            console.log(trade, "trade")
            console.log(routerTrade, "routerTrade")
            console.log(opts, "opts")
            console.log(params, "params")

            let ethBalance;
            let tokenA;
            let tokenB;

            ethBalance = await provider.getBalance(RECIPIENT);
            tokenA = tokenAddress1.balance;
            tokenB = tokenAddress2.balance;

            console.log("---------------Before")
            console.log("Eth Balance: ", ethers.utils.formatUnits(ethBalance, 18))
            console.log("token a", tokenA)
            console.log("token b", tokenB)

            const tx = await signer.sendTransaction({
                value: params.value,
                to: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
                from: RECIPIENT,
                data: params.calldata,
            })


            console.log("---------------CALLING ME")
            const receipt = await tx.wait();

            console.log("--------------Success")
            console.log(receipt.status, "Status")

            ethBalance = await provider.getBalance(RECIPIENT);
            tokenA = tokenAddress1.balance;
            tokenB = tokenAddress2.balance;

            console.log("---------------After")

            console.log("Eth Balance: ", ethers.utils.formatUnits(ethBalance, 18))
            console.log("token a", tokenA)
            console.log("token b", tokenB)

        } catch (error) {
            const errMsg = parseErrorMsg(error)
            notifyError(errMsg)
            console.log(error)
        }
    }

    return (
        <CONTEXT.Provider
            value={
                {
                    TOKEN_SWAP,
                    LoadToken,
                    notifyError,
                    notifySuccess,
                    setloader,
                    loader,
                    connect,
                    address,
                    swap,
                }
            }
        >{children}</CONTEXT.Provider>
    )
}
