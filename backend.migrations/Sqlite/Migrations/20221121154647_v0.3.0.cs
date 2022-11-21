using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace assetgrid_backend.Migrations.Sqlite.Migrations
{
    public partial class v030 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Attachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    FileName = table.Column<string>(type: "TEXT", maxLength: 250, nullable: false),
                    FileSize = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Attachments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MetaFields",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 250, nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    ValueType = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MetaFields", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TransactionMetaAccount",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ValueId = table.Column<int>(type: "INTEGER", nullable: false),
                    FieldId = table.Column<int>(type: "INTEGER", nullable: false),
                    ObjectId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionMetaAccount", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransactionMetaAccount_Accounts_ValueId",
                        column: x => x.ValueId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransactionMetaAccount_MetaFields_FieldId",
                        column: x => x.FieldId,
                        principalTable: "MetaFields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransactionMetaAccount_Transactions_ObjectId",
                        column: x => x.ObjectId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TransactionMetaAttachment",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ValueId = table.Column<Guid>(type: "TEXT", nullable: false),
                    FieldId = table.Column<int>(type: "INTEGER", nullable: false),
                    ObjectId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionMetaAttachment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransactionMetaAttachment_Attachments_ValueId",
                        column: x => x.ValueId,
                        principalTable: "Attachments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransactionMetaAttachment_MetaFields_FieldId",
                        column: x => x.FieldId,
                        principalTable: "MetaFields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransactionMetaAttachment_Transactions_ObjectId",
                        column: x => x.ObjectId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TransactionMetaBoolean",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Value = table.Column<bool>(type: "INTEGER", nullable: false),
                    FieldId = table.Column<int>(type: "INTEGER", nullable: false),
                    ObjectId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionMetaBoolean", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransactionMetaBoolean_MetaFields_FieldId",
                        column: x => x.FieldId,
                        principalTable: "MetaFields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransactionMetaBoolean_Transactions_ObjectId",
                        column: x => x.ObjectId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TransactionMetaNumber",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Value = table.Column<long>(type: "INTEGER", nullable: false),
                    FieldId = table.Column<int>(type: "INTEGER", nullable: false),
                    ObjectId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionMetaNumber", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransactionMetaNumber_MetaFields_FieldId",
                        column: x => x.FieldId,
                        principalTable: "MetaFields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransactionMetaNumber_Transactions_ObjectId",
                        column: x => x.ObjectId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TransactionMetaTextLine",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Value = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                    FieldId = table.Column<int>(type: "INTEGER", nullable: false),
                    ObjectId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionMetaTextLine", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransactionMetaTextLine_MetaFields_FieldId",
                        column: x => x.FieldId,
                        principalTable: "MetaFields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransactionMetaTextLine_Transactions_ObjectId",
                        column: x => x.ObjectId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TransactionMetaTextLong",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Value = table.Column<string>(type: "TEXT", nullable: false),
                    FieldId = table.Column<int>(type: "INTEGER", nullable: false),
                    ObjectId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionMetaTextLong", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransactionMetaTextLong_MetaFields_FieldId",
                        column: x => x.FieldId,
                        principalTable: "MetaFields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransactionMetaTextLong_Transactions_ObjectId",
                        column: x => x.ObjectId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TransactionMetaTransaction",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ValueId = table.Column<int>(type: "INTEGER", nullable: false),
                    FieldId = table.Column<int>(type: "INTEGER", nullable: false),
                    ObjectId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionMetaTransaction", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransactionMetaTransaction_MetaFields_FieldId",
                        column: x => x.FieldId,
                        principalTable: "MetaFields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransactionMetaTransaction_Transactions_ObjectId",
                        column: x => x.ObjectId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransactionMetaTransaction_Transactions_ValueId",
                        column: x => x.ValueId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserMetaFields",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    FieldId = table.Column<int>(type: "INTEGER", nullable: false),
                    Permissions = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserMetaFields", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserMetaFields_MetaFields_FieldId",
                        column: x => x.FieldId,
                        principalTable: "MetaFields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserMetaFields_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaAccount_FieldId",
                table: "TransactionMetaAccount",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaAccount_ObjectId",
                table: "TransactionMetaAccount",
                column: "ObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaAccount_ValueId",
                table: "TransactionMetaAccount",
                column: "ValueId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaAttachment_FieldId",
                table: "TransactionMetaAttachment",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaAttachment_ObjectId",
                table: "TransactionMetaAttachment",
                column: "ObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaAttachment_ValueId",
                table: "TransactionMetaAttachment",
                column: "ValueId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaBoolean_FieldId",
                table: "TransactionMetaBoolean",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaBoolean_ObjectId",
                table: "TransactionMetaBoolean",
                column: "ObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaNumber_FieldId",
                table: "TransactionMetaNumber",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaNumber_ObjectId",
                table: "TransactionMetaNumber",
                column: "ObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaTextLine_FieldId",
                table: "TransactionMetaTextLine",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaTextLine_ObjectId",
                table: "TransactionMetaTextLine",
                column: "ObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaTextLong_FieldId",
                table: "TransactionMetaTextLong",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaTextLong_ObjectId",
                table: "TransactionMetaTextLong",
                column: "ObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaTransaction_FieldId",
                table: "TransactionMetaTransaction",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaTransaction_ObjectId",
                table: "TransactionMetaTransaction",
                column: "ObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionMetaTransaction_ValueId",
                table: "TransactionMetaTransaction",
                column: "ValueId");

            migrationBuilder.CreateIndex(
                name: "IX_UserMetaFields_FieldId",
                table: "UserMetaFields",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_UserMetaFields_UserId",
                table: "UserMetaFields",
                column: "UserId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TransactionMetaAccount");

            migrationBuilder.DropTable(
                name: "TransactionMetaAttachment");

            migrationBuilder.DropTable(
                name: "TransactionMetaBoolean");

            migrationBuilder.DropTable(
                name: "TransactionMetaNumber");

            migrationBuilder.DropTable(
                name: "TransactionMetaTextLine");

            migrationBuilder.DropTable(
                name: "TransactionMetaTextLong");

            migrationBuilder.DropTable(
                name: "TransactionMetaTransaction");

            migrationBuilder.DropTable(
                name: "UserMetaFields");

            migrationBuilder.DropTable(
                name: "Attachments");

            migrationBuilder.DropTable(
                name: "MetaFields");
        }
    }
}
