import "../styles/globals.css";
import { PROvider } from "../context/context"
import { Toaster } from "react-hot-toast"

export default function App({ Component, pageProps }) {
  return (
    <>
      <PROvider>
        <Component {...pageProps} />
      </PROvider>
      <Toaster />

      <script src="assets/js/jquery.min.js"></script>
      <script src="assets/js/proper-min.js"></script>
      <script src="assets/js/bootstrap.min.js"></script>
      <script src="assets/js/plugin/waypoint.min.js"></script>
      <script src="assets/js/plugin/owl.carousel.min.js"></script>
      <script src="assets/js/plugin/jquery.nice-select.min.js"></script>
      <script src="assets/js/plugin/wow.min.js"></script>
      <script src="assets/js/main.js"></script>
    </>
  );
}
