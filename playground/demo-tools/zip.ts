export interface ZipEntry {
    name: string;
    content: string | Uint8Array;
}

const utf8Encoder = new TextEncoder();

function uint16(value: number): Uint8Array {
    return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function uint32(value: number): Uint8Array {
    return new Uint8Array([
        value & 0xff,
        (value >>> 8) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 24) & 0xff
    ]);
}

function join(parts: readonly Uint8Array[]): Uint8Array {
    const length = parts.reduce((total, part) => total + part.length, 0);
    const result = new Uint8Array(length);
    let offset = 0;

    for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
    }

    return result;
}

export function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;

    for (const byte of bytes) {
        crc ^= byte;

        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }

    return (crc ^ 0xffffffff) >>> 0;
}

export function createStoredZip(entries: readonly ZipEntry[]): Uint8Array {
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    for (const entry of [...entries].sort((left, right) =>
        left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    )) {
        const name = utf8Encoder.encode(entry.name);
        const content =
            typeof entry.content === 'string' ? utf8Encoder.encode(entry.content) : entry.content;
        const checksum = crc32(content);
        const localHeader = join([
            uint32(0x04034b50),
            uint16(20),
            uint16(0x0800),
            uint16(0),
            uint16(0),
            uint16(0),
            uint32(checksum),
            uint32(content.length),
            uint32(content.length),
            uint16(name.length),
            uint16(0),
            name
        ]);

        localParts.push(localHeader, content);
        centralParts.push(
            join([
                uint32(0x02014b50),
                uint16(20),
                uint16(20),
                uint16(0x0800),
                uint16(0),
                uint16(0),
                uint16(0),
                uint32(checksum),
                uint32(content.length),
                uint32(content.length),
                uint16(name.length),
                uint16(0),
                uint16(0),
                uint16(0),
                uint16(0),
                uint32(0),
                uint32(offset),
                name
            ])
        );
        offset += localHeader.length + content.length;
    }

    const localData = join(localParts);
    const centralData = join(centralParts);
    const end = join([
        uint32(0x06054b50),
        uint16(0),
        uint16(0),
        uint16(entries.length),
        uint16(entries.length),
        uint32(centralData.length),
        uint32(localData.length),
        uint16(0)
    ]);

    return join([localData, centralData, end]);
}
