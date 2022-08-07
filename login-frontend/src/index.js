import "./styles/main.scss";
// import logoImage from './assets/images/logo.png';

// import axios 
import axios from 'axios';

var mainContent;

const processLogin = async (login, pass) => {

    let resuestBody = {
        user: {
            login: login,
            password: pass
        },
        chain_id: 1337,
    }

    // update page main content
    mainContent.innerHTML = "";

    axios.post('http://localhost:3001/login', resuestBody).then(
        response => {
            console.log(response);
        }
    ).catch(error => {
        console.error(error.response.data);
        console.dir(error);

    });
}


window.addEventListener('load',
    function () {
        mainContent = document.getElementById('main-content');
        // get login button
        var loginButton = document.getElementById('login-button');
        loginButton.onclick = async () => {
            console.log('login button clicked');
            // get username and password
            let login = document.getElementById('username').value;
            let password = document.getElementById('password').value;
            processLogin(login, password);
        }
    }, false);

