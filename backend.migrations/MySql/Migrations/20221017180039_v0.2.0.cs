using Microsoft.EntityFrameworkCore.Metadata;
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

            migrationBuilder.CreateTable(
                name: "TransactionAutomations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "varchar(250)", maxLength: 250, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    TriggerOnCreate = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    TriggerOnModify = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Query = table.Column<string>(type: "json", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Actions = table.Column<string>(type: "json", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionAutomations", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "UserTransactionAutomations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TransactionAutomationId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Enabled = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Permissions = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserTransactionAutomations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserTransactionAutomations_TransactionAutomations_Transactio~",
                        column: x => x.TransactionAutomationId,
                        principalTable: "TransactionAutomations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserTransactionAutomations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionLines_Category",
                table: "TransactionLines",
                column: "Category",
                filter: "Category IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_UserTransactionAutomations_TransactionAutomationId",
                table: "UserTransactionAutomations",
                column: "TransactionAutomationId");

            migrationBuilder.CreateIndex(
                name: "IX_UserTransactionAutomations_UserId",
                table: "UserTransactionAutomations",
                column: "UserId");
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

            migrationBuilder.DropTable(
                name: "UserTransactionAutomations");

            migrationBuilder.DropTable(
                name: "TransactionAutomations");

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
