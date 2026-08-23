import { HeaderComponent } from './components/Header.js';
import { FooterComponent } from './components/Footer.js';



document.addEventListener("DOMContentLoaded", ()=>{

// Header रेंडर करें (active Page का नाम पास करें: 'home', 'about', 'help', 'others')
HeaderComponent.render('help');
// Footer रेंडर करें
FooterComponent.render('app-footer');

});