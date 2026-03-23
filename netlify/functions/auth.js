const ImageKit = require('imagekit');

exports.handler = async (event, context) => {
  const publicKey = (process.env.IMAGEKIT_PUBLIC_KEY || "").trim();
  const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || "").trim();
  const urlEndpoint = (process.env.IMAGEKIT_URL_ENDPOINT || "").trim();

  if (!publicKey || !privateKey || !urlEndpoint) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Kòd sekrè ImageKit yo manke nan Netlify!" }),
    };
  }

  const imagekit = new ImageKit({
    publicKey: publicKey,
    privateKey: privateKey,
    urlEndpoint: urlEndpoint
  });

  try {
    const authenticationParameters = imagekit.getAuthenticationParameters();

    // ✅ NOU AJOUTE publicKey NAN REPONS LAN
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...authenticationParameters,
        publicKey: publicKey
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
