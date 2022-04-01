import { generator } from './Generator.js';
import { web3 } from "./Web3Client.js"
import "./styles/main.scss";

const sth = async () => {
    console.log("shits working looks like", generator());
    const networkId = await web3.eth.net.getId();
    console.log({ networkId });

    document.getElementById("getNetworkIdButton").onclick = async () => {
        const networkId = await web3.eth.net.getId();
        console.log({ networkId });
        document.getElementById("networkId").innerHTML = `Network id is ${networkId}`;
    };
}
sth();
