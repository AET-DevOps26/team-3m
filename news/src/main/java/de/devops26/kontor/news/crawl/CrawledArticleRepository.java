package de.devops26.kontor.news.crawl;

import static de.devops26.kontor.news.generated.tables.CrawledArticle.CRAWLED_ARTICLE;

import de.devops26.kontor.news.generated.tables.records.CrawledArticleRecord;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import org.jooq.DSLContext;
import org.jooq.InsertOnDuplicateStep;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class CrawledArticleRepository {

    private final DSLContext dsl;

    public CrawledArticleRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    @Transactional(readOnly = true)
    public Set<String> findPushedUrlHashes(Collection<String> urlHashes) {
        if (urlHashes.isEmpty()) {
            return Set.of();
        }
        var table = CRAWLED_ARTICLE;
        return Set.copyOf(dsl.select(table.URL_HASH)
                .from(table)
                .where(table.URL_HASH.in(urlHashes).and(table.PUSHED_AT.isNotNull()))
                .fetch(table.URL_HASH));
    }

    @Transactional
    public void markSeen(CrawledArticle article) {
        insertStep(article, null)
                .onConflict(CRAWLED_ARTICLE.URL_HASH)
                .doNothing()
                .execute();
    }

    @Transactional
    public void markPushed(CrawledArticle article, OffsetDateTime pushedAt) {
        insertStep(article, pushedAt)
                .onConflict(CRAWLED_ARTICLE.URL_HASH)
                .doUpdate()
                .set(CRAWLED_ARTICLE.PUSHED_AT, pushedAt)
                .execute();
    }

    private InsertOnDuplicateStep<CrawledArticleRecord> insertStep(CrawledArticle article, OffsetDateTime pushedAt) {
        var table = CRAWLED_ARTICLE;
        return dsl.insertInto(table)
                .set(table.ID, UUID.randomUUID())
                .set(table.URL_HASH, article.urlHash())
                .set(table.URL, article.url())
                .set(table.SOURCE, article.source())
                .set(table.FEED_URL, article.feedUrl())
                .set(table.TITLE, article.title())
                .set(table.PUBLISHED_AT, article.publishedAt())
                .set(table.FIRST_SEEN_AT, article.firstSeenAt())
                .set(table.PUSHED_AT, pushedAt);
    }
}
