export default class Player {
    constructor(name) {
        this.name = name;

        this.posX = 0;
        this.posY = 0;

        this.strength = 0;
        this.intelligence = 0;
        this.dexterity = 0;
        this.spirit = 0;

        this.speed = 5;

        this.level = 1;
        this.experience = 0;

        this.maxHealth = 100;
        this.currentHealth = 100;

        this.weaponSkills = {
            slashing: 10,
            bludgeoning: 10,
            piercing: 10,
            distance: 10,
            shielding: 10,
            magic: 0
        };
        this.gatheringSkills = {
            treeChopping: 1
        };
        this.craftingSkills = {
            alchemy: 1
        };
        this.currentTarget = null;
        this.targetId = null;
    }
}
