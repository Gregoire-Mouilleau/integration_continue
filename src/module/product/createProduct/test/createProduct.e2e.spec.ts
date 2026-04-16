import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { Product } from '../../Product';
import { buildApp } from '../../../../config/app';
import request from 'supertest';
import { Express } from 'express';

describe('US-1 : Créer un produit - E2E', () => {
    let container: StartedPostgreSqlContainer;
    let dataSource: DataSource;
    let app: Express;

    beforeAll(async () => {
        container = await new PostgreSqlContainer('postgres:16').withExposedPorts(5432).start();

        dataSource = new DataSource({
            type: 'postgres',
            host: container.getHost(),
            port: container.getPort(),
            username: container.getUsername(),
            password: container.getPassword(),
            database: container.getDatabase(),
            logging: false,
            entities: [Product],
            synchronize: true,
            entitySkipConstructor: true
        });

        await dataSource.initialize();

        const AppDataSource = require('../../../../config/db.config').default;

        app = buildApp();

        Object.assign(AppDataSource, dataSource);
    });

    afterAll(async () => {
        if (dataSource?.isInitialized) {
            await dataSource.destroy();
        }
        if (container) {
            await container.stop();
        }
    });

    test('Scénario 1: création réussie', async () => {
        // Étant donné qu'il n'y a pas de produit enregistré
        await dataSource.getRepository(Product).clear();

        // Quand je créé un produit avec en titre «switch 2», description «nouvelle console» et un prix à 500
        const response = await request(app)
            .post('/api/product')
            .send({
                title: 'switch 2',
                description: 'nouvelle console',
                price: 500
            })
            .set('Content-Type', 'application/json');

        // Alors le produit doit être créé
        expect(response.status).toBe(201);
        const products = await dataSource.getRepository(Product).find();
        expect(products).toHaveLength(1);
        expect(products[0].title).toBe('switch 2');
        expect(products[0].description).toBe('nouvelle console');
        expect(products[0].price).toBe(500);
    });

    test('Scénario 2: création échouée - titre trop court', async () => {
        // Étant donné qu'il n'y a pas de produit enregistré
        await dataSource.getRepository(Product).clear();

        // Quand je créé un produit avec en titre «sw»
        const response = await request(app)
            .post('/api/product')
            .send({
                title: 'sw',
                description: 'nouvelle console',
                price: 500
            })
            .set('Content-Type', 'application/json');

        // Alors une erreur doit être envoyée "titre trop court"
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('titre trop court');

        const products = await dataSource.getRepository(Product).find();
        expect(products).toHaveLength(0);
    });

    test('Scénario 3 : création échouée, prix négatif', async () => {
        // Étant donné qu'il n'y a pas de produit enregistré
        await dataSource.getRepository(Product).clear();

        // Quand je créé un produit avec en prix -10
        const response = await request(app)
            .post('/api/product')
            .send({
                title: 'switch',
                description: 'nouvelle console',
                price: -10
            })
            .set('Content-Type', 'application/json');

        // Alors une erreur doit être envoyée «le prix doit être supérieur à 0»
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('le prix doit être supérieur à 0');
        const products = await dataSource.getRepository(Product).find();
        expect(products).toHaveLength(0);
    });

    test('Scénario 4: création échouée, prix supérieur à 10000', async () => {
        // Étant donné qu'il n'y a pas de produit enregistré
        await dataSource.getRepository(Product).clear();

        // Quand je créé un produit avec en prix 11000
        const response = await request(app)
            .post('/api/product')
            .send({
                title: 'switch',
                description: 'nouvelle console',
                price: 11000
            })
            .set('Content-Type', 'application/json');

        // Alors une erreur doit être envoyée «le prix doit être inférieur à 10000»
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('le prix doit être inférieur à 10000');

        // Vérification qu'aucun produit n'a été créé
        const products = await dataSource.getRepository(Product).find();
        expect(products).toHaveLength(0);
    });

    test('Scénario 5: création échouée - titre supérieur à 20 caractères', async () => {
        // Étant donné qu'il n'y a pas de produit enregistré
        await dataSource.getRepository(Product).clear();

        // Quand je créé un produit avec un titre de plus de 20 caractères
        const response = await request(app)
            .post('/api/product')
            .send({
                title: '123456789012345678901',
                description: 'nouvelle console',
                price: 500
            })
            .set('Content-Type', 'application/json');

        // Alors une erreur doit être envoyée «le titre doit faire 20 caractères max»
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('le titre doit faire 20 caractères max');

        const products = await dataSource.getRepository(Product).find();
        expect(products).toHaveLength(0);
    });

    test('Scénario 6: création échouée - description contient @', async () => {
        // Étant donné qu'il n'y a pas de produit enregistré
        await dataSource.getRepository(Product).clear();

        // Quand je créé un produit avec une description contenant '@'
        const response = await request(app)
            .post('/api/product')
            .send({
                title: 'switch',
                description: 'nouvelle console@gmail.com',
                price: 500
            })
            .set('Content-Type', 'application/json');

        // Alors une erreur doit être envoyée «la description ne doit pas contenir "@"»
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('la description ne doit pas contenir "@"');

        // Vérification qu'aucun produit n'a été créé
        const products = await dataSource.getRepository(Product).find();
        expect(products).toHaveLength(0);
    });

    /*
     * Règle : le titre ne commence pas par un espace
     *
     * Scénario 7 : Création réussie (titre sans espace initial)
     *
     * Quand je crée un produit avec :
     *   titre : «switch»
     *   description : «nouvelle console»
     *   prix : 500
     *
     * Alors le produit est créé
     *
     *
     * Scénario 8 : Création échouée (titre commençant par un espace)
     *
     * Quand je crée un produit avec :
     *   titre : « switch» (commence par un espace)
     *   description : «nouvelle console»
     *   prix : 500
     *
     * Alors le produit n'est pas créé
     * Et je suis informé de l'erreur «le titre ne doit pas commencer par un espace»
     */

    test('Scénario 7: création réussie - titre sans espace initial', async () => {
        // Étant donné qu'il n'y a pas de produit enregistré
        await dataSource.getRepository(Product).clear();

        // Quand je créé un produit avec en titre «switch» (sans espace initial)
        const response = await request(app)
            .post('/api/product')
            .send({
                title: 'switch',
                description: 'nouvelle console',
                price: 500
            })
            .set('Content-Type', 'application/json');

        // Alors le produit doit être créé
        expect(response.status).toBe(201);
        const products = await dataSource.getRepository(Product).find();
        expect(products).toHaveLength(1);
        expect(products[0].title).toBe('switch');
    });

    test('Scénario 8: création échouée - titre commence par un espace', async () => {
        // Étant donné qu'il n'y a pas de produit enregistré
        await dataSource.getRepository(Product).clear();

        // Quand je créé un produit avec en titre « switch» (commence par un espace)
        const response = await request(app)
            .post('/api/product')
            .send({
                title: ' switch',
                description: 'nouvelle console',
                price: 500
            })
            .set('Content-Type', 'application/json');

        // Alors une erreur doit être envoyée «le titre ne doit pas commencer par un espace»
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('le titre ne doit pas commencer par un espace');

        // Vérification qu'aucun produit n'a été créé
        const products = await dataSource.getRepository(Product).find();
        expect(products).toHaveLength(0);
    });
});
