import dotnet from 'node-api-dotnet/net9.0';
import path from 'node:path';

const { Beatmap } = dotnet.require(
    path.resolve(__dirname, '../native/dist/binding')
) as typeof import('../native/dist/binding');

export { Beatmap };
