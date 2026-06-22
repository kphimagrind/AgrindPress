import Navbar from "../components/navbar.js";
import Footer from "../components/footer.js";

async function init() {
  await Navbar.render("navbar");
  await Footer.render("footer");
}

init();