using assetgrid_backend.models.MetaFields;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static assetgrid_backend.models.MetaFields.UserMetaField;

namespace assetgrid_backend.models.ViewModels
{
    public class ViewMetaField
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public MetaFieldType Type { get; set; }
        public MetaFieldValueType ValueType { get; set; }
        public FieldPermissions Permissions { get; set; }

        public ViewMetaField(int id, string name, string description, MetaFieldType type, MetaFieldValueType valueType, FieldPermissions permissions)
        {
            Id = id;
            Name = name;
            Description = description;
            Type = type;
            ValueType = valueType;
            Permissions = permissions;
        }
    }

    public class ViewSetMetaField
    {
        public int MetaId { get; set; }
        public object? Value { get; set; }
    }

    public class ViewCreateMetaField
    {
        [MaxLength(50, ErrorMessage = "Name must be shorter than 50 characters.")]
        public string Name { get; set; } = null!;
        [MaxLength(50, ErrorMessage = "Description must be shorter than 250 characters.")]
        public string Description { get; set; } = null!;
        public MetaFieldType Type { get; set; }
        public MetaFieldValueType ValueType { get; set; }
    }

    public class ViewMetaFieldValue
    {
        public int MetaId { get; set; }
        public string MetaName { get; set; } = null!;
        public MetaFieldValueType Type { get; set; }
        public object? Value { get; set; } = null!;
    }
}
