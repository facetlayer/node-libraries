import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

interface DomainResult {
    domain: string;
    available: boolean;
    error?: string;
    reason?: string;
}

interface RDAPResponse {
    events?: Array<{
        eventAction: string;
        eventDate: string;
    }>;
    status?: string[];
    [key: string]: any;
}

interface DNSResponse {
    Status: number;
    Answer?: Array<{
        name: string;
        type: number;
        data: string;
    }>;
}

const RDAP_SERVERS: Record<string, string> = {
    'com': 'https://rdap.verisign.com/com/v1',
    'net': 'https://rdap.verisign.com/net/v1',
    'org': 'https://rdap.publicinterestregistry.org/rdap',
    'info': 'https://rdap.afilias.net/rdap',
    'io': 'https://rdap.nic.io',
    'co': 'https://rdap.nic.co',
    'me': 'https://rdap.nic.me',
    'tv': 'https://rdap.nic.tv',
    'app': 'https://rdap.nic.google',
    'dev': 'https://rdap.nic.google',
    'cloud': 'https://rdap.nic.google',
    'biz': 'https://rdap.nic.biz',
};

async function dnsLookup(domain: string, recordType: string = 'A'): Promise<string[]> {
    try {
        const url = new URL('https://cloudflare-dns.com/dns-query');
        url.searchParams.set('name', domain);
        url.searchParams.set('type', recordType);

        const response = await fetch(url.toString(), {
            headers: { 'Accept': 'application/dns-json' },
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) return [];

        const data = await response.json() as DNSResponse;
        return data.Answer ? data.Answer.map(a => a.data) : [];
    } catch {
        return [];
    }
}

async function rdapLookup(domain: string): Promise<RDAPResponse | null> {
    try {
        const tld = domain.split('.').pop()?.toLowerCase();
        if (!tld) return null;

        let rdapUrl: string;

        if (RDAP_SERVERS[tld]) {
            rdapUrl = `${RDAP_SERVERS[tld]}/domain/${domain}`;
        } else {
            const bootstrapResponse = await fetch(
                `https://rdap-bootstrap.arin.net/bootstrap/domain/${domain}`,
                { signal: AbortSignal.timeout(5000) }
            );
            if (!bootstrapResponse.ok) return null;

            const bootstrapData = await bootstrapResponse.json() as any;
            if (bootstrapData.services?.length > 0) {
                rdapUrl = `${bootstrapData.services[0][0][0]}domain/${domain}`;
            } else {
                return null;
            }
        }

        const response = await fetch(rdapUrl, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) return null;

        return await response.json() as RDAPResponse;
    } catch {
        return null;
    }
}

async function httpProbe(domain: string): Promise<boolean> {
    for (const protocol of ['https', 'http']) {
        try {
            const response = await fetch(`${protocol}://${domain}`, {
                method: 'HEAD',
                signal: AbortSignal.timeout(4000),
                redirect: 'manual',
            });
            // Any response (including redirects) means something is there
            if (response.status > 0) return true;
        } catch {
            // Connection refused, timeout, etc. — domain not serving
        }
    }
    return false;
}

async function checkDomain(domain: string): Promise<DomainResult> {
    try {
        // Step 1: DNS lookup
        const [aRecords, nsRecords] = await Promise.all([
            dnsLookup(domain, 'A'),
            dnsLookup(domain, 'NS'),
        ]);

        if (aRecords.length > 0 || nsRecords.length > 0) {
            return { domain, available: false, reason: 'has DNS records' };
        }

        // Step 2: RDAP lookup
        const rdapData = await rdapLookup(domain);

        if (rdapData) {
            const hasRegistration = rdapData.events?.some(e =>
                e.eventAction === 'registration' || e.eventAction === 'last changed'
            );
            if (hasRegistration) {
                return { domain, available: false, reason: 'registered (RDAP)' };
            }

            if (rdapData.status?.some(s => s.includes('active') || s.includes('ok'))) {
                return { domain, available: false, reason: 'active status (RDAP)' };
            }
        }

        // Step 3: HTTP probe — if domain passed DNS and RDAP checks, verify nothing responds
        const responds = await httpProbe(domain);
        if (responds) {
            return { domain, available: false, reason: 'responds to HTTP' };
        }

        return { domain, available: true };
    } catch (error) {
        return { domain, available: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function checkAll(domains: string[], batchSize: number = 10): Promise<DomainResult[]> {
    const results: DomainResult[] = [];

    for (let i = 0; i < domains.length; i += batchSize) {
        const batch = domains.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(d => checkDomain(d)));
        results.push(...batchResults);

        // Progress
        const done = Math.min(i + batchSize, domains.length);
        process.stderr.write(`\rChecked ${done}/${domains.length} domains...`);

        if (i + batchSize < domains.length) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    process.stderr.write('\n');
    return results;
}

async function main() {
    const argv = await yargs(hideBin(process.argv))
        .usage('Usage: $0 <domain1> <domain2> ...')
        .demandCommand(1, 'Provide at least one domain to check')
        .strict()
        .help()
        .parse();

    const domains = (argv._ as string[]).map(d => String(d).trim().toLowerCase());

    const results = await checkAll(domains);

    const available = results.filter(r => r.available);
    const unavailable = results.filter(r => !r.available && !r.error);
    const errors = results.filter(r => r.error);

    console.log('\n=== Domain Availability Results ===\n');

    if (available.length > 0) {
        console.log(`AVAILABLE (${available.length}):`);
        for (const r of available) {
            console.log(`  ✓ ${r.domain}`);
        }
        console.log();
    }

    if (unavailable.length > 0) {
        console.log(`TAKEN (${unavailable.length}):`);
        for (const r of unavailable) {
            console.log(`  ✗ ${r.domain} — ${r.reason}`);
        }
        console.log();
    }

    if (errors.length > 0) {
        console.log(`ERRORS (${errors.length}):`);
        for (const r of errors) {
            console.log(`  ? ${r.domain} — ${r.error}`);
        }
        console.log();
    }

    console.log(`Summary: ${available.length} available, ${unavailable.length} taken, ${errors.length} errors out of ${results.length} checked`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
