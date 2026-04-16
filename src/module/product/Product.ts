import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

const MAX_TITLE_LENGTH = 20;

@Entity()
export class Product {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ nullable: true, type: 'float' })
    public price: number;

    @Column({ type: 'varchar', length: 255 })
    public title: string;

    @Column({ type: 'text', nullable: true })
    public description: string;

    constructor({
        title,
        description,
        price
    }: {
        title: string;
        description: string;
        price: number;
    }) {
        this.applyChanges(title, description, price);
    }

    update(title: string, description: string, price: number) {
        this.applyChanges(title, description, price);
    }

    private applyChanges(title: string, description: string, price: number) {
        this.checkPrice(price);
        this.validateTitle(title);
        this.validateDescription(description);

        this.title = title;
        this.description = description;
        this.price = price;
    }

    private validateTitle(title: string) {
        if (title.startsWith(' ')) {
            throw new Error('le titre ne doit pas commencer par un espace');
        }

        if (title.length < 3) {
            throw new Error('titre trop court');
        }

        if (title.length > MAX_TITLE_LENGTH) {
            throw new Error('le titre doit faire 20 caractères max');
        }
    }

    private validateDescription(description: string) {
        if (description.includes('@')) {
            throw new Error('la description ne doit pas contenir "@"');
        }
    }

    private checkPrice(price: number) {
        if (price <= 0) {
            throw new Error('le prix doit être supérieur à 0');
        }

        if (price > 10000) {
            throw new Error('le prix doit être inférieur à 10000');
        }
    }
}
