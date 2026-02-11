export class Database {
    private static readonly MachineId = 10;
    private static readonly DataCenterId = 11;

    public static getClusterDetails() {
        return {
            machine_id: parseInt(process.env.MACHINE_ID || Database.MachineId.toString(), 10),
            datacenter_id: parseInt(process.env.DATACENTER_ID || Database.DataCenterId.toString(), 10)
        }
    }
    
}