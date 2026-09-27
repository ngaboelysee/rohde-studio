-- CreateTable
CREATE TABLE "CategorySetting" (
    "category" "Category" NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategorySetting_pkey" PRIMARY KEY ("category")
);
