import { AppDataSource } from "@/config/database";
import { Repository, EntityTarget, ObjectLiteral } from "typeorm";
import { User } from "./User";
import { Role } from "./Role";
import { Address } from "./Address";

const repositoryCache = new Map<EntityTarget<ObjectLiteral>, Repository<ObjectLiteral>>();

function getRepository<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
  if (!AppDataSource.isInitialized) {
    throw new Error("Database not initialized. Call connectDatabase() first.");
  }
  
  const cached = repositoryCache.get(entity as EntityTarget<ObjectLiteral>);
  if (cached) {
    return cached as Repository<T>;
  }
  
  const repo = AppDataSource.getRepository(entity);
  repositoryCache.set(entity as EntityTarget<ObjectLiteral>, repo as Repository<ObjectLiteral>);
  return repo;
}

function createRepoProxy<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
  return new Proxy({} as Repository<T>, {
    get(_target, prop) {
      return getRepository(entity)[prop as keyof Repository<T>];
    },
  });
}

const repos = {
  User: createRepoProxy(User),
  Role: createRepoProxy(Role),
  Address: createRepoProxy(Address),
};

export const UserRepo = repos.User;
export const RoleRepo = repos.Role;
export const AddressRepo = repos.Address;

export const getRepo = <T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> => {
  return getRepository(entity);
};
