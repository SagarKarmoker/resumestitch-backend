-- CreateTable
CREATE TABLE "product_feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" VARCHAR(80),
    "page_url" VARCHAR(2048),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_feedback_user_id_created_at_idx" ON "product_feedback"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "product_feedback" ADD CONSTRAINT "product_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
