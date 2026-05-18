import pathlib

root = pathlib.Path(__file__).resolve().parent
patterns = [
    ('Detay pou Livrezon', 'Détails de livraison'),
    ('Non konplè w *', 'Nom complet *'),
    ('Nimewo WhatsApp ou *', 'Numéro WhatsApp *'),
    ('-- Chwazi Zòn Livrezon --', '-- Choisissez une zone de livraison --'),
    ("L'òt Zòn (Ekri l anba)", 'Autre zone (précisez ci-dessous)'),
    ('Presize zòn ou an la...', 'Précisez votre zone ici...'),
    ('Chwazi Mwayen Peman', 'Choisir le moyen de paiement'),
    ('💵 Peye Manyèlman (Kontakte machann lan)', '💵 Paiement manuel (contactez le vendeur)'),
    ('📲 Peye ak NatCash', '📲 Payer avec NatCash'),
    ('Chwazi "Peye Manyèlman" pou kontakte machann lan sou WhatsApp, negosye epi voye prèv peman an. Machann lan ap valide kòmand ou.', 'Choisissez « Paiement manuel » pour contacter le vendeur sur WhatsApp, négocier et envoyer la preuve de paiement. Le vendeur validera votre commande.'),
    ('📱 WhatsApp Machann', '📱 WhatsApp Vendeur'),
    ('Konfime Kòmand la ✅', 'Valider la commande ✅'),
    ('ajoute nan panye', 'ajouté au panier'),
    ('Panye a vid', 'Panier vide'),
    ('Bonjou ${sellerName}, mwen enterese ak kòmand pou pwodwi mwen mete nan panye a.', 'Bonjour ${sellerName}, je suis intéressé par ces produits :'),
    ('Panye a vid. Ajoute yon pwodwi avan ou kontakte machann.', 'Le panier est vide. Ajoutez un produit avant de contacter un vendeur.'),
    ('Gen plizyè machann nan panye a. Chwazi yon machann pou kontakte:', 'Il y a plusieurs vendeurs dans le panier. Choisissez un vendeur à contacter :'),
    ('Antre nimewo machann lan pou kontakte li.', 'Entrez le numéro du vendeur à contacter.'),
    ('Chwa default pa valab. Aksyon an anile.', 'Choix invalide. Action annulée.'),
    ('Bonjour ${group.sellerName}, mwen enterese ak pwodwi sa yo:', 'Bonjour ${group.sellerName}, je suis intéressé par ces produits :'),
    ('Bonjour ${selectedGroup.sellerName}, mwen gen yon kòmand pou pwodwi sa yo:', 'Bonjour ${selectedGroup.sellerName}, je souhaite commander ces produits :'),
    ('⚠️ Erè: Fòm nan pa jwenn nan paj la.', '⚠️ Erreur : le formulaire est introuvable sur la page.'),
    ('⚠️ Ranpli tout chan yo!', '⚠️ Veuillez remplir tous les champs !'),
    ('Tanpri kontakte machann lan sou WhatsApp pou w negosye ak peye. Apre ou fin peye, voye prèv la bay machann lan pou validasyon.', 'Veuillez contacter le vendeur sur WhatsApp pour négocier et payer. Après paiement, envoyez la preuve au vendeur pour validation.'),
    ('Dashboard Machann - Boutique Piyay', 'Tableau de bord Vendeur - Boutique Piyay'),
    ('Avis Kliyan', 'Avis Clients'),
    ('Ajoute Pwodwi', 'Ajouter un produit'),
    ('Kòmand yo', 'Commandes'),
    ('Jere livrezon pwodwi ou yo pou debloke lajan ou', 'Gérez les livraisons de vos produits pour débloquer votre argent'),
    ('Chaje kòmand yo...', 'Chargement des commandes...'),
    ('Pa gen avis ankò.', 'Aucun avis pour le moment.'),
    ('Kòmand Konplete', 'Commande terminée'),
    ('Boost Pwodwi ou!', 'Boostez votre produit !'),
    ('Chwazi kijan ou vle mete pwodwi sa a anlè nèt nan paj akey la.', 'Choisissez comment vous souhaitez mettre ce produit en avant sur la page d’accueil.'),
    ('Peye Boost (100 HTG)', 'Boost payant (100 HTG)'),
    ('Boost pwodwi ou pandan 48h pou sèlman 100 HTG via MonCash.', 'Boostez votre produit pendant 48h pour seulement 100 HTG via MonCash.'),
    ('Pou boost pwodwi ou, peye manyèlman epi voye prèv la bay admin.', 'Pour booster votre produit, payez manuellement et envoyez la preuve à l’admin.'),
    ('Apre ou fin peye, voye prèv la epi antre kòd ou resevwa a pou aktive boost la.', 'Après paiement, envoyez la preuve et entrez le code reçu pour activer le boost.'),
    ('Mwen peye, voye prèv & kòd', 'J’ai payé, envoyer preuve & code'),
    ('Voye prèv sou WhatsApp Admin', 'Envoyer la preuve sur WhatsApp Admin'),
    ('Anile', 'Annuler'),
    ('Opsyon gratis pa disponib. Sèlman boost peye pral parèt kòm pwodwi vedèt.', 'Option gratuite non disponible. Seuls les boosts payants figureront comme produits vedettes.'),
    ('Antre kòd aksè ou resevwa nan men admin lan apre ou fin peye MonCash/NatCash:', 'Entrez le code d’accès reçu de l’admin après avoir payé MonCash/NatCash :'),
    ('Ou dwe antre kòd la pou aktive boost la.', 'Vous devez entrer le code pour activer le boost.'),
    ('Kòd pa valab. Kontakte admin.', 'Code invalide. Contactez l’administrateur.'),
    ('Boost aktive! Kòd ou te valide.', 'Boost activé ! Votre code a été validé.'),
    ('✅ Boost aktive gratis!', '✅ Boost activé gratuitement !'),
    ('Okenn kòmand poko fèt.', 'Aucune commande n’a encore été passée.'),
    ('Pas de commentaire.', 'Pas de commentaire.'),
    ('Kòmand Total', 'Commandes Totales'),
    ('Lis Machann yo', 'Liste des vendeurs'),
    ('Kont Kliyan', 'Compte Client'),
    ('Istwa Kòmand mwen yo', 'Historique de mes commandes'),
    ('Bonjou ', 'Bonjour '),
    ('Èske ou resevwa kòmand lan tout bon? Sa pral lage lajan an bay machann nan.', 'Avez-vous bien reçu la commande ? Cela libérera les fonds au vendeur.'),
    ('Mèsi! Kòmand lan konplè epi lajan an transfere bay machann nan.', 'Merci ! La commande est terminée et les fonds ont été transférés au vendeur.'),
    ('Vizite Boutik →', 'Visiter la boutique →'),
    ('Pa gen machann toujou', 'Aucun vendeur pour le moment'),
    ('Pa gen pwodwi toujou', 'Aucun produit pour le moment'),
    ('Machann yo ap ajoute byento!', 'Les vendeurs ajouteront bientôt leurs produits !'),
    ('🛒 Ajoute', '🛒 Ajouter'),
    ('Kòmand', 'Commande'),
    ('Kliyan:', 'Client:'),
    ('Machann', 'Vendeur'),
    ('Kliyan', 'Client'),
]
extra = [
    ('Panye', 'Panier'),
    ('Kliyan', 'Client'),
    ('Machann', 'Vendeur'),
    ('Livrezon', 'Livraison'),
    ('Chwazi', 'Choisissez'),
    ('Konfime', 'Confirmer'),
    ('Nimewo', 'Numéro'),
    ('Zòn', 'Zone'),
    ('Ajoute', 'Ajouter'),
    ('Peye', 'Payer'),
    ('Pou kounya', 'Pour le moment'),
    ('Apre ou fin peye', 'Après avoir payé'),
    ('Voye prèv', 'Envoyez la preuve'),
    ('pou w', 'pour vous'),
    ('kòd', 'code'),
    ('Anile', 'Annuler'),
]
patterns = sorted(patterns, key=lambda x: -len(x[0]))
for before, after in extra:
    patterns.append((before, after))
root = root
changed = []
for path in root.rglob('*'):
    if path.suffix.lower() not in {'.html', '.js', '.md'}:
        continue
    if 'node_modules' in path.parts or '.git' in path.parts:
        continue
    text = path.read_text(encoding='utf-8')
    original = text
    for before, after in patterns:
        text = text.replace(before, after)
    if text != original:
        path.write_text(text, encoding='utf-8')
        changed.append(str(path.relative_to(root)))
print('Modified', len(changed), 'files')
for p in changed:
    print(p)
