export class Database {
    private static readonly MachineId = 10;
    private static readonly DataCenterId = 11;

    public static getClusterDetails() {
        return {
            machine_id: Database.MachineId,
            datacenter_id: Database.DataCenterId
        }
    }
    
}