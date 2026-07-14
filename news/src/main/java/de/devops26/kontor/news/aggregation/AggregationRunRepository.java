package de.devops26.kontor.news.aggregation;

import static de.devops26.kontor.news.generated.tables.AggregationRun.AGGREGATION_RUN;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class AggregationRunRepository {

    private final DSLContext dsl;

    public AggregationRunRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    @Transactional
    public AggregationRun insertRunning(AggregationTrigger trigger, OffsetDateTime startedAt) {
        var table = AGGREGATION_RUN;
        var id = UUID.randomUUID();
        dsl.insertInto(table)
                .set(table.ID, id)
                .set(table.TRIGGERED_BY, trigger.dbValue())
                .set(table.STATUS, AggregationStatus.RUNNING.dbValue())
                .set(table.STARTED_AT, startedAt)
                .execute();
        return new AggregationRun(id, trigger, AggregationStatus.RUNNING, startedAt, null, 0, 0, null);
    }

    @Transactional
    public void markFinished(
            UUID id,
            AggregationStatus status,
            OffsetDateTime finishedAt,
            int itemsSeen,
            int itemsPublished,
            String error) {
        var table = AGGREGATION_RUN;
        dsl.update(table)
                .set(table.STATUS, status.dbValue())
                .set(table.FINISHED_AT, finishedAt)
                .set(table.ITEMS_SEEN, itemsSeen)
                .set(table.ITEMS_PUBLISHED, itemsPublished)
                .set(table.ERROR, error)
                .where(table.ID.eq(id))
                .execute();
    }

    @Transactional
    public int failStaleRunning(OffsetDateTime finishedAt, String error) {
        var table = AGGREGATION_RUN;
        return dsl.update(table)
                .set(table.STATUS, AggregationStatus.FAILED.dbValue())
                .set(table.FINISHED_AT, finishedAt)
                .set(table.ERROR, error)
                .where(table.STATUS.eq(AggregationStatus.RUNNING.dbValue()))
                .execute();
    }

    @Transactional(readOnly = true)
    public Optional<UUID> findMostRecentRunningId() {
        var table = AGGREGATION_RUN;
        return dsl.select(table.ID)
                .from(table)
                .where(table.STATUS.eq(AggregationStatus.RUNNING.dbValue()))
                .orderBy(table.STARTED_AT.desc())
                .limit(1)
                .fetchOptional(table.ID);
    }

    @Transactional(readOnly = true)
    public Optional<OffsetDateTime> findLatestStartedAt(AggregationTrigger trigger) {
        var table = AGGREGATION_RUN;
        return dsl.select(table.STARTED_AT)
                .from(table)
                .where(table.TRIGGERED_BY.eq(trigger.dbValue()))
                .orderBy(table.STARTED_AT.desc())
                .limit(1)
                .fetchOptional(table.STARTED_AT);
    }

    @Transactional(readOnly = true)
    public Optional<AggregationRun> findById(UUID id) {
        var table = AGGREGATION_RUN;
        return dsl.selectFrom(table).where(table.ID.eq(id)).fetchOptional(AggregationRunRepository::toRun);
    }

    @Transactional(readOnly = true)
    public List<AggregationRun> findRecent(int limit) {
        var table = AGGREGATION_RUN;
        return dsl.selectFrom(table)
                .orderBy(table.STARTED_AT.desc())
                .limit(limit)
                .fetch(AggregationRunRepository::toRun);
    }

    private static AggregationRun toRun(Record record) {
        var table = AGGREGATION_RUN;
        return new AggregationRun(
                record.get(table.ID),
                AggregationTrigger.fromDbValue(record.get(table.TRIGGERED_BY)),
                AggregationStatus.fromDbValue(record.get(table.STATUS)),
                record.get(table.STARTED_AT),
                record.get(table.FINISHED_AT),
                record.get(table.ITEMS_SEEN),
                record.get(table.ITEMS_PUBLISHED),
                record.get(table.ERROR));
    }
}
