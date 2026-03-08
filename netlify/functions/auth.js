const ImageKit = require('imagekit');

exports.handler = async (event, context) => {
  // Rekipere fileName si li voye l, sinon sèvi ak yon default
  const { fileName } = event.queryStringParameters || {};

  const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
  });

  // ImageKit bezwen menm kòd la chak fwa
  const authenticationParameters = imagekit.getAuthenticationParameters();

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(authenticationParameters),
  };
};
