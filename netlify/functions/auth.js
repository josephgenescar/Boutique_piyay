const ImageKit = require('imagekit');

exports.handler = async (event, context) => {
  // Rekipere kòd yo epi netwaye yo (trim) pou evite espas ki gate siyati a
  const publicKey = (process.env.IMAGEKIT_PUBLIC_KEY || "").trim();
  const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || "").trim();
  const urlEndpoint = (process.env.IMAGEKIT_URL_ENDPOINT || "").trim();

  // Si yon kòd manke, bay yon erè klè nan logs Netlify yo
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
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(authenticationParameters),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
