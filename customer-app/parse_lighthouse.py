import json
with open('lighthouse-report.report.json', encoding='utf-8') as f:
    d = json.load(f)

print(f"Performance: {d['categories']['performance']['score']*100 if d['categories']['performance']['score'] else 'N/A'}")
print(f"Accessibility: {d['categories']['accessibility']['score']*100 if d['categories']['accessibility']['score'] else 'N/A'}")
print(f"Best Practices: {d['categories']['best-practices']['score']*100 if d['categories']['best-practices']['score'] else 'N/A'}")
print(f"SEO: {d['categories']['seo']['score']*100 if d['categories']['seo']['score'] else 'N/A'}")
print(f"FCP: {d['audits']['first-contentful-paint']['displayValue']}")
print(f"LCP: {d['audits']['largest-contentful-paint']['displayValue']}")
print(f"TBT: {d['audits']['total-blocking-time']['displayValue']}")
print(f"Speed Index: {d['audits']['speed-index']['displayValue']}")
print(f"CLS: {d['audits']['cumulative-layout-shift']['displayValue']}")
print(f"Redirects: {d['audits']['redirects'].get('displayValue', 'None')}")
