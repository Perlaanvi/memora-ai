/**
 * MEMORA AI — Firestore Data Migration Script
 * Migrates collections and user-scoped subcollections from OLD to NEW project.
 *
 * Usage:
 *   SOURCE_PROJECT=crested-alloy-lcjpc \
 *   DEST_PROJECT=memora-ai-6ebfd \
 *   npx tsx scripts/migrate-firestore.ts
 */

import { initializeApp as initAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

const sourceProjectId = process.env.SOURCE_PROJECT || 'crested-alloy-lcjpc';
const destProjectId = process.env.DEST_PROJECT || 'memora-ai-6ebfd';
const sourceDbId = process.env.SOURCE_DB_ID || 'ai-studio-memoraai-e3369424-fe9d-4816-81c4-2babd54b612a';
const destDbId = process.env.DEST_DB_ID || '(default)';

console.log('================================================================');
console.log('       MEMORA AI — FIRESTORE DATA MIGRATION RUNNER             ');
console.log('================================================================');
console.log(`Source Project: ${sourceProjectId} (DB: ${sourceDbId})`);
console.log(`Dest Project:   ${destProjectId} (DB: ${destDbId})\n`);

// Initialize Source App
const sourceApp = initAdminApp({ projectId: sourceProjectId }, 'sourceApp');
const sourceDb = getAdminFirestore(sourceApp, sourceDbId);

// Initialize Destination App
const destApp = initAdminApp({ projectId: destProjectId }, 'destApp');
const destDb = getAdminFirestore(destApp, destDbId);

const TOP_LEVEL_COLLECTIONS = [
  'users',
  'documents',
  'memories',
  'goals',
  'projects',
  'ideas',
  'learnings',
  'chat_threads',
  'chat_messages',
  'memory_vectors'
];

interface MigrationStats {
  collection: string;
  sourceCount: number;
  migratedCount: number;
  failedCount: number;
  errors: string[];
}

async function migrateCollection(collectionName: string): Promise<MigrationStats> {
  const stats: MigrationStats = {
    collection: collectionName,
    sourceCount: 0,
    migratedCount: 0,
    failedCount: 0,
    errors: []
  };

  try {
    const snap = await sourceDb.collection(collectionName).get();
    stats.sourceCount = snap.size;

    if (snap.empty) {
      console.log(`[EMPTY] Collection "${collectionName}" has 0 documents to migrate.`);
      return stats;
    }

    console.log(`[MIGRATING] Collection "${collectionName}": ${snap.size} documents found...`);

    // Batch writes in chunks of 400 (under Firestore limit of 500)
    const docs = snap.docs;
    const batchSize = 400;

    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const batch = destDb.batch();

      for (const docSnap of chunk) {
        const docRef = destDb.collection(collectionName).doc(docSnap.id);
        batch.set(docRef, docSnap.data());
      }

      await batch.commit();
      stats.migratedCount += chunk.length;
    }

    console.log(`[SUCCESS] Collection "${collectionName}": ${stats.migratedCount}/${stats.sourceCount} migrated.`);

    // If migrating 'users', also migrate knowledge graph subcollections
    if (collectionName === 'users') {
      for (const userDoc of docs) {
        const userId = userDoc.id;

        // Subcollection 1: knowledge_entities
        const entitiesSnap = await sourceDb
          .collection('users')
          .doc(userId)
          .collection('knowledge_entities')
          .get();

        if (!entitiesSnap.empty) {
          const subBatch = destDb.batch();
          for (const entDoc of entitiesSnap.docs) {
            const destSubRef = destDb
              .collection('users')
              .doc(userId)
              .collection('knowledge_entities')
              .doc(entDoc.id);
            subBatch.set(destSubRef, entDoc.data());
          }
          await subBatch.commit();
          console.log(`  -> Migrated ${entitiesSnap.size} knowledge_entities for user ${userId}`);
        }

        // Subcollection 2: knowledge_relationships
        const relsSnap = await sourceDb
          .collection('users')
          .doc(userId)
          .collection('knowledge_relationships')
          .get();

        if (!relsSnap.empty) {
          const subBatch = destDb.batch();
          for (const relDoc of relsSnap.docs) {
            const destSubRef = destDb
              .collection('users')
              .doc(userId)
              .collection('knowledge_relationships')
              .doc(relDoc.id);
            subBatch.set(destSubRef, relDoc.data());
          }
          await subBatch.commit();
          console.log(`  -> Migrated ${relsSnap.size} knowledge_relationships for user ${userId}`);
        }
      }
    }
  } catch (err: any) {
    stats.failedCount = stats.sourceCount - stats.migratedCount;
    stats.errors.push(err.message || String(err));
    console.error(`[ERROR] Failed to migrate "${collectionName}":`, err.message);
  }

  return stats;
}

async function runMigration() {
  const allStats: MigrationStats[] = [];

  for (const col of TOP_LEVEL_COLLECTIONS) {
    const stat = await migrateCollection(col);
    allStats.push(stat);
  }

  console.log('\n================================================================');
  console.log('                  MIGRATION SUMMARY REPORT                      ');
  console.log('================================================================');
  console.table(allStats.map(s => ({
    Collection: s.collection,
    Source: s.sourceCount,
    Migrated: s.migratedCount,
    Failed: s.failedCount,
    Status: s.errors.length > 0 ? 'FAILED/REQUIRES_AUTH' : s.sourceCount > 0 ? 'COMPLETE' : 'EMPTY'
  })));
}

runMigration().catch(console.error);
