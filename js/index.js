import { HeaderComponent } from './components/Header.js';
import { FooterComponent } from './components/Footer.js';
import {Dashboard} from "./dashbord.js"



document.addEventListener("DOMContentLoaded", () => {
    HeaderComponent.render('home'); // activePage: 'home', 'about', 'help'
    FooterComponent.render();
	new Dashboard();
});

