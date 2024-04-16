import { ethers } from "ethers";
import web3Modal from "web3modal";

// internal import
import ERC20ABI from "./abi.json";


export const ERC20_ABI = ERC20ABI;
export const V3_SWAP_ROUTER_ADDRESS =
  "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";

//TEST_ACCOUNT_FORK
const TEST_ACCOUNT = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";

// fetch network
const fetchTokenNetwork = (address, signer) => new ethers.Contract(address, ERC20_ABI, signer);

export const web3Provider = async () => {
  try {
    const web3modal = new web3Modal();
    const connection = await web3modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    return provider
  } catch (error) {
    console.log(error)
  }
}

export const CONNECTING_CONTRACT = async (addr) => {
  try {
    const TEST_ACCOUNT = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";
    const provider = await web3Provider();

    // const network = await provider.getNetwork();
    const signer = provider.getSigner();
    const contract = fetchTokenNetwork(addr, signer);

    // user address
    // const userAddress = await signer.getAddress();
    const balance = await contract.balanceOf(TEST_ACCOUNT);

    const name = await contract.name();
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();
    const supply = await contract.totalSupply();
    const address = contract.address;

    const token = {
      address: address,
      decimals: decimals,
      name: name,
      symbol: symbol,
      supply: ethers.utils.formatEther(supply.toString()),
      balance: ethers.utils.formatEther(balance.toString()),
      chainId: 1,
      // chainId: network.chainId,
    }
    return token;

  } catch (error) {
    console.log(error)
  }
}