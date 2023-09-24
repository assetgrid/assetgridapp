using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace assetgrid_backend.Migrations.MySql
{
    public partial class _040 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DateTime",
                table: "Attachments",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "OwnerId",
                table: "Attachments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(@"
                UPDATE Attachments
                SET OwnerId = (SELECT Id FROM Users)
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_OwnerId",
                table: "Attachments",
                column: "OwnerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_Users_OwnerId",
                table: "Attachments",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_Users_OwnerId",
                table: "Attachments");

            migrationBuilder.DropIndex(
                name: "IX_Attachments_OwnerId",
                table: "Attachments");

            migrationBuilder.DropColumn(
                name: "DateTime",
                table: "Attachments");

            migrationBuilder.DropColumn(
                name: "OwnerId",
                table: "Attachments");
        }
    }
}
