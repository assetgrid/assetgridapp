using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace assetgrid_backend.Migrations.Sqlite.Migrations
{
    public partial class v020 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSplit",
                table: "Transactions",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "TransactionLines",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

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
                SET Category = (SELECT Transactions.Category FROM Transactions WHERE TransactionLines.TransactionId = Transactions.Id)
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
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 250, nullable: false),
                    TriggerOnCreate = table.Column<bool>(type: "INTEGER", nullable: false),
                    TriggerOnModify = table.Column<bool>(type: "INTEGER", nullable: false),
                    Query = table.Column<string>(type: "json", nullable: false),
                    Actions = table.Column<string>(type: "json", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionAutomations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserTransactionAutomations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TransactionAutomationId = table.Column<int>(type: "INTEGER", nullable: false),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    Enabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    Permissions = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserTransactionAutomations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserTransactionAutomations_TransactionAutomations_TransactionAutomationId",
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
                });

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
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

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
