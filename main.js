// Main JavaScript File
function orderProduct(title, price, id) {
  let qtyInput = document.getElementById(`qty-${title.replace(/\s+/g,'-').toLowerCase()}`);
  let qty = qtyInput.value;
  let message = `Bonjour, je veux commander ${qty} x ${title} (Prix: ${price} HTG)`;
  
  let whatsappNumber = "509XXXXXXXX"; // Mete nimewo admin la
  let url = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;
  
  window.open(url, "_blank");
}
