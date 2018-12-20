export class ParserPCAP {

    constructor(private jsonTrace: any) {

    }

    public getQUICVersion(): string {
        // Loop all packets, return as soon as a version is found
        for (let x of this.jsonTrace) {
            let quic = x['_source']['layers']['quic'];
            // Only long headers contain version
            if (quic['quic.header_form'] === '1') {
                return quic['quic.version'];
            }
        }

        return 'None';
    }

    public getConnectionID(): string {
        return this.jsonTrace[0]['_source']['layers']['quic']['quic.scid'].replace(/:/g, '');
    }

    public getStartTime(): number {
        return parseFloat(this.jsonTrace[0]['_source']['layers']['frame']['frame.time_epoch']);
    }

    public getConnectionInfo() {
        let layer_ip = this.jsonTrace[0]['_source']['layers']['ip'];
        let layer_udp = this.jsonTrace[0]['_source']['layers']['udp'];

        return {
            ip_version: layer_ip['ip.version'],
            srcip: layer_ip['ip.src'],
            dstip: layer_ip['ip.dst'],
            srcport: layer_udp['udp.srcport'],
            dstport: layer_udp['udp.dstport'],
        }
    }

}