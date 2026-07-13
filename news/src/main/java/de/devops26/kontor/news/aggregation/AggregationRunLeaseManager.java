package de.devops26.kontor.news.aggregation;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Optional;
import javax.sql.DataSource;
import org.springframework.stereotype.Component;

@Component
public class AggregationRunLeaseManager {

    private static final long LOCK_ID = 0x4b4f4e544f524e4cL;

    private final DataSource dataSource;

    public AggregationRunLeaseManager(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public Optional<Lease> tryAcquire() {
        Connection connection = null;
        try {
            connection = dataSource.getConnection();
            connection.setAutoCommit(true);
            try (var statement = connection.prepareStatement("SELECT pg_try_advisory_lock(?)")) {
                statement.setLong(1, LOCK_ID);
                try (var result = statement.executeQuery()) {
                    if (result.next() && result.getBoolean(1)) {
                        return Optional.of(new Lease(connection));
                    }
                }
            }
            connection.close();
            return Optional.empty();
        } catch (SQLException e) {
            closeAfterFailure(connection);
            throw new IllegalStateException("Could not acquire the aggregation lock", e);
        }
    }

    private static void closeAfterFailure(Connection connection) {
        if (connection == null) {
            return;
        }
        try {
            connection.abort(Runnable::run);
        } catch (SQLException ignored) {
            // The original database failure is more useful to the caller.
        }
    }

    public static final class Lease implements AutoCloseable {

        private Connection connection;

        private Lease(Connection connection) {
            this.connection = connection;
        }

        @Override
        public synchronized void close() {
            if (connection == null) {
                return;
            }
            var leasedConnection = connection;
            connection = null;
            try (var statement = leasedConnection.prepareStatement("SELECT pg_advisory_unlock(?)")) {
                statement.setLong(1, LOCK_ID);
                statement.execute();
                leasedConnection.close();
            } catch (SQLException e) {
                closeAfterFailure(leasedConnection);
                throw new IllegalStateException("Could not release the aggregation lock", e);
            }
        }
    }
}
