import Web3 from 'web3';
import { web3, networks, getGasPrice, getContract, getCoinPrice, makeContractCall } from "./Web3Client.js"
import "./styles/main.scss";

var contract;

const connectBtn = document.getElementById("connect");
var currentNetworkId = null;




const initialize = async () => {
    let network_config;
    if (currentNetworkId in networks) {
        network_config = networks[currentNetworkId];
    } else {
        return;
    }

    console.log("INITIALIZE " + network_config.name);
    document.getElementById("networkName").innerHTML = network_config.name;
    document.getElementById("contractUrl").href = `${network_config.explorer_url}address/${network_config.contract_address}`;
    document.getElementById("contractUrl").innerHTML = "Contract";
    let gas = await getGasPrice();
    document.getElementById("gasPrice").innerHTML = `gas price is ${window.web3.utils.fromWei(gas, "gwei")} gwei`;
    document.getElementById("getOtpButton").onclick = async () => {
        const otp = await makeContractCall(contract, "getNewOtp", []);
        alert(`${otp}`);
    };
    let coinPrice = await getCoinPrice(network_config);
    contract = await getContract(network_config);

    let methods_container = document.getElementById("methods");
    methods_container.innerHTML = "";

    Object.keys(contract.methods).filter(x => !x.includes("0x") && !x.includes("(")).forEach(method_name => {
        let d = document.createElement("div");
        d.innerHTML = method_name;
        d.id = method_name;
        d.class = "";
        methods_container.appendChild(d);

        let btn = document.createElement("button");
        btn.setAttribute("class", "btn btn-outline-primary")
        btn.innerHTML = "Call";
        btn.onclick = () => makeContractCall(contract, method_name, []);
        d.appendChild(btn);


    })

}

const setupEventListeners = async () => {
    window.ethereum.on('accountsChanged', async function (accounts) {
        console.log('accountsChanges', accounts);
        initialize();

    });

    // detect Network account change
    window.ethereum.on('networkChanged', async function (networkId) {
        console.log('networkChanged', networkId);
        currentNetworkId = networkId;
        initialize();
    });
}



const ethEnabled = async () => {
    if (window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        window.web3 = new Web3(window.ethereum);
        currentNetworkId = window.ethereum.networkVersion;
        console.log({ currentNetworkId });
        connectBtn.disabled = true;
        return true;
    }
    connectBtn.disabled = false;
    return false;
}

const main = async () => {
    setupEventListeners();



    connectBtn.onclick = async () => {
        let connected = await ethEnabled();
        if (connected) {
            initialize();
        }
    }
    let network_names = Object.keys(networks).filter(x => !x.includes("default"));
    console.log({ network_names });




    // initialize(networks[networks.default]);
}

main();
