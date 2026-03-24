const ImageKit = require('imagekit');

exports.handler = async (event, context) => {
  const publicKey = (process.env.IMAGEKIT_PUBLIC_KEY || "").trim();
  const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || "").trim();
  const urlEndpoint = (process.env.IMAGEKIT_URL_ENDPOINT || "").trim();

  // Tcheke si tout kle yo la
  if (!publicKey || !privateKey || !urlEndpoint) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Kle ImageKit yo manke nan konfigirasyon Netlify!" }),
    };
  }

  const imagekit = new ImageKit({
    publicKey: publicKey,
    privateKey: privateKey,
    urlEndpoint: urlEndpoint
  });

  try {
    // Jenere pèmisyon pou upload la
    const authenticationParameters = imagekit.getAuthenticationParameters();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token: authenticationParameters.token,
        expire: authenticationParameters.expire,
        signature: authenticationParameters.signature,
        publicKey: publicKey // Sa a trè enpòtan pou kliyan an ka wè li
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erè nan jenere pèmisyon: " + err.message }),
    };
  }
};
