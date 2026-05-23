"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsensusHealthMonitor = void 0;
class ConsensusHealthMonitor {
    history;
    logicalClock;
    constructor() {
        this.history = [];
        this.logicalClock = 0;
    }
    recordSnapshot(partial) {
        this.logicalClock++;
        this.history.push({ ...partial, timestamp: this.logicalClock });
    }
    getLatestSnapshot() {
        return this.history[this.history.length - 1];
    }
    getHistory() {
        return [...this.history];
    }
    detectAnomalies() {
        const anomalies = [];
        const latest = this.getLatestSnapshot();
        if (!latest)
            return anomalies;
        if (latest.quorumHealth < 0.5) {
            anomalies.push('unstable_quorum');
        }
        if (this.history.length >= 3) {
            const last3 = this.history.slice(-3);
            const alternates = last3[0].voteStability > 0.7 &&
                last3[1].voteStability < 0.3 &&
                last3[2].voteStability > 0.7;
            const alternates2 = last3[0].voteStability < 0.3 &&
                last3[1].voteStability > 0.7 &&
                last3[2].voteStability < 0.3;
            if (alternates || alternates2) {
                anomalies.push('consensus_oscillation');
            }
        }
        if (this.history.length >= 2) {
            const last2 = this.history.slice(-2);
            if (last2[0].partitionPressure > 0.8 && last2[1].partitionPressure > 0.8) {
                anomalies.push('repeated_split_brain');
            }
        }
        if (latest.leaderStability < 0.4) {
            anomalies.push('leader_churn');
        }
        if (latest.partitionPressure > 0.7) {
            anomalies.push('partition_pressure_high');
        }
        return anomalies;
    }
    computeOverallHealth() {
        const latest = this.getLatestSnapshot();
        if (!latest)
            return 1.0;
        return (latest.quorumHealth * 0.3 +
            latest.voteStability * 0.25 +
            latest.leaderStability * 0.25 +
            (1 - latest.partitionPressure) * 0.2);
    }
    reset() {
        this.history = [];
        this.logicalClock = 0;
    }
}
exports.ConsensusHealthMonitor = ConsensusHealthMonitor;
//# sourceMappingURL=ConsensusHealthMonitor.js.map