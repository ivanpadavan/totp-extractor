import { Writer } from 'protobufjs/minimal.js';
export function migration(index = 0, size = 1, options: { algorithm?: number; digits?: number; type?: number; counter?: string; name?: string; version?: number | null; omitGroup?: boolean; single?: boolean } = {}) {
  const w = Writer.create();
  for (const name of (options.single ? [options.name || 'alice@example.com'] : [options.name || 'alice@example.com', 'bob@example.com'])) {
    w.uint32(10).fork().uint32(10).bytes(new TextEncoder().encode('12345678901234567890')).uint32(18).string(name).uint32(26).string('Example').uint32(32).int32(options.algorithm ?? 1).uint32(40).int32(options.digits ?? 1).uint32(48).int32(options.type ?? 2).uint32(56).uint64(options.counter ?? '0').ldelim();
  }
  if (options.version !== null) w.uint32(16).int32(options.version ?? 1);
  if (!options.omitGroup) w.uint32(24).int32(size).uint32(32).int32(index).uint32(40).int32(42);
  return `otpauth-migration://offline?data=${encodeURIComponent(Buffer.from(w.finish()).toString('base64'))}`;
}
