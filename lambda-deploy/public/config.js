const localMacwattsHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
  || window.location.protocol === "file:";

window.MACWATTS_CONFIG = {
  apiBaseUrl: localMacwattsHost
    ? "http://localhost:8080"
    : "https://ikuf62mxjq5flcx2yud25t2tra0wejfh.lambda-url.eu-west-3.on.aws",
};
 

// API AWS Lambda.
