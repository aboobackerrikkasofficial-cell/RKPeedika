import os

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # App.jsx specific replaces for the terms/policy modals
    content = content.replace('Returns & Exchange Policy', 'Exchange Policy (5 Days)')
    content = content.replace('our return and exchange policy is designed to be fair and transparent', 'our exchange policy is designed to be fair and transparent')
    content = content.replace('We offer **exchanges only** within **{storeSettings?.returnWindow || 3} days of delivery** for eligible items.', 'We offer **exchanges only** within **5 days of delivery** for eligible items. To apply for an exchange, you must share a video of the product (showing the damage, defect, or wrong item clearly) via WhatsApp to +91 9188072646.')
    content = content.replace('exchange requests must be raised within {storeSettings?.returnWindow || 3} days', 'exchange requests must be raised within 5 days')
    content = content.replace('Non-Returnable / Non-Exchangeable Items', 'Non-Exchangeable Items')
    content = content.replace('return/exchange policy?', 'exchange policy?')
    content = content.replace('We offer a {storeSettings?.returnWindow || 3}-day exchange policy for unused items in original packaging. Photo evidence is required for damaged items.', 'We offer a 5-day exchange policy for unused items in original packaging. Video evidence of the damaged, defective, or wrong item is strictly required via WhatsApp at +91 9188072646.')
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('c:/Users/aboob/Downloads/DropByRikkas/customer-app/src'):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            update_file(os.path.join(root, file))
