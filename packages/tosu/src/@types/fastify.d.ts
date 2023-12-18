import { InstanceManager } from '@/objects/instanceManager/instanceManager';

declare module 'fastify' {
    interface FastifyRequest {
        instanceManager: InstanceManager;
    }
}
