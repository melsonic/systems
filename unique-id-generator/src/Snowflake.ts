export class Snowflake {
    private timestampEpochStart: bigint = 1581270426n;
    private readonly TimeStampBits = 41n;
    private readonly DataCenterBits = 5n;
    private readonly MachineBits = 5n;
    private readonly SequenceNumberBits = 12n;
    private dataCenterId: bigint;
    private machineId: bigint;

    // to keep track
    private sequenceNumberTracker: bigint = 0n;
    private lastTimestamp: bigint = -1n;

    // shiftbits
    private readonly machineIdShift = this.SequenceNumberBits;
    private readonly dataCenterIdShift = this.SequenceNumberBits + this.MachineBits;
    private readonly timeStampShift = this.SequenceNumberBits + this.MachineBits + this.DataCenterBits;
    private readonly signBitShift = 63n;

    // max values
    private readonly maxTimeStamp = (1n << this.TimeStampBits) - 1n;
    private readonly maxMachineId = (1n << this.MachineBits) - 1n;
    private readonly maxDataCenterId = (1n << this.DataCenterBits) - 1n;
    private readonly maxSequenceId = (1n << this.SequenceNumberBits) - 1n;

    public constructor(dataCenterId: number | bigint, machineId: number | bigint) {
        if (BigInt(dataCenterId) > this.maxDataCenterId || BigInt(machineId) > this.maxMachineId) {
            throw new Error("datacenter/machine limit exceeded");
        }
        this.dataCenterId = BigInt(dataCenterId);
        this.machineId = BigInt(machineId);
    }

    public getSnowFlakeId(): bigint {
        let timestamp = this.getTime();

        if (timestamp < this.lastTimestamp) {
            throw new Error("time clock moving backwards");
        } else if (timestamp > this.lastTimestamp) {
            this.sequenceNumberTracker = 0n;
        } else {
            if (this.sequenceNumberTracker === this.maxSequenceId) {
                timestamp = this.getNextTimeStamp(timestamp);
                this.sequenceNumberTracker = 0n;
            } else {
                this.sequenceNumberTracker = this.sequenceNumberTracker + 1n;
            }
        }
        this.lastTimestamp = timestamp;

        return (
            (0n << this.signBitShift) |
            ((timestamp - this.timestampEpochStart) << this.timeStampShift) |
            (this.dataCenterId << this.dataCenterIdShift) |
            (this.machineId << this.machineIdShift) |
            (this.sequenceNumberTracker)
        );
    }

    private getNextTimeStamp(timestamp: bigint): bigint {
        let nextTimestamp = this.getTime();
        while (nextTimestamp <= timestamp) {
            nextTimestamp = this.getTime();
        }
        return nextTimestamp;
    }

    private getTime(): bigint {
        return BigInt(Date.now());
    }
}