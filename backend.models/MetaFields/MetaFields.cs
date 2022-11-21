using assetgrid_backend.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace assetgrid_backend.models.MetaFields
{
    public class MetaFieldValue<T>
    {
        public int Id { get; set; }

        public int FieldId { get; set; }
        public virtual MetaField Field { get; set; } = default!;


        public int ObjectId { get; set; }
        public virtual T Object { get; set; } = default!;
    }

    public class MetaTextLine<T> : MetaFieldValue<T>
    {
        [MaxLength(255)]
        public required string Value { get; set; }
    }

    public class MetaTextLong<T> : MetaFieldValue<T>
    {
        public required string Value { get; set; }
    }

    public class MetaTransaction<T> : MetaFieldValue<T>
    {
        public int ValueId { get; set; }
        public required virtual Transaction Value { get; set; }
    }

    public class MetaAccount<T> : MetaFieldValue<T>
    {
        public int ValueId { get; set; }
        public required virtual Account Value { get; set; }
    }

    public class MetaAttachment<T> : MetaFieldValue<T>
    {
        public Guid ValueId { get; set; }
        public required virtual Attachment Value { get; set; }
    }

    public class MetaBoolean<T> : MetaFieldValue<T>
    {
        public bool Value { get; set; }
    }

    public class MetaNumber<T> : MetaFieldValue<T>
    {
        public long Value { get; set; }
    }
}
