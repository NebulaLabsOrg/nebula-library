import { ethers } from "ethers";
import { feInteractWithContract } from "../src/contract.utils.js";
import 'dotenv/config';

// Parameters
const signer = new ethers.Wallet(process.env.PRV_KEY, new ethers.JsonRpcProvider(process.env.RPC)) // Replace with your private key
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, process.env.ABI, signer); // Replace with your contract address and ABI
const methodName = process.env.METHOD_NAME; // Replace with your method name
const params = []; // Replace with your method parameters if any

console.log("Calling: feInteractWithContract");
console.log(await feInteractWithContract(contract, "READ", methodName, params));