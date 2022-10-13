using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace assetgrid_backend.Migrations.MySql
{
    public partial class v020 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSplit",
                table: "Transactions",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "TransactionLines",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.Sql(@"
                UPDATE Transactions SET IsSplit = CASE
                    WHEN EXISTS (SELECT 1 FROM TransactionLines WHERE TransactionId = Transactions.Id) THEN 1
                    ELSE 0
                END;
            ");
            migrationBuilder.Sql(@"
                INSERT INTO TransactionLines (TransactionId, `Order`, Amount, Description, Category)
                SELECT Id, 1, Total, '', Category
                FROM Transactions
                WHERE IsSplit = 0
            ");
            migrationBuilder.Sql(@"
                UPDATE TransactionLines
                LEFT JOIN Transactions ON TransactionLines.TransactionId = Transactions.Id
                SET TransactionLines.Category = Transactions.Category
            ");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_Category",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Transactions");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionLines_Category",
                table: "TransactionLines",
                column: "Category",
                filter: "Category IS NOT NULL");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Transactions",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.Sql(@"
                UPDATE Transactions
                SET Category = (SELECT Category FROM TransactionLines WHERE TransactionId = Transactions.Id)
            ");

            migrationBuilder.DropIndex(
                name: "IX_TransactionLines_Category",
                table: "TransactionLines");

            migrationBuilder.DropColumn(
                name: "IsSplit",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "TransactionLines");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_Category",
                table: "Transactions",
                column: "Category",
                filter: "Category IS NOT NULL");
        }
    }
}
