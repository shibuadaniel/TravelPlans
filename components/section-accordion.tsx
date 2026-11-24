"use client";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useState } from "react";

const accordionSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 1,
  boxShadow: "none",
  backgroundImage: "none",
  m: 0,
  mb: 1,
  "&:before": { display: "none" },
  "&.Mui-expanded": { m: 0, mb: 1 },
  "&:first-of-type, &:last-of-type": { borderRadius: 1 },
} as const;

export function SectionAccordion({
  title,
  count,
  expanded,
  defaultExpanded,
  onChange,
  editHref,
  onEdit,
  onAdd,
  locked = false,
  children,
}: {
  title: string;
  count?: number;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onChange?: (open: boolean) => void;
  editHref?: string;
  onEdit?: () => void;
  onAdd?: () => void;
  locked?: boolean;
  children: React.ReactNode;
}) {
  const label = count === undefined ? title : `${title} (${count})`;
  const controlled = expanded !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(Boolean(defaultExpanded));
  const open = locked || (controlled ? expanded : uncontrolledOpen);
  const hasActions = Boolean(onAdd || editHref || onEdit);

  return (
    <Box sx={{ position: "relative", mb: 1 }}>
      <Accordion
        disableGutters
        elevation={0}
        sx={{ ...accordionSx, mb: 0, "&.Mui-expanded": { m: 0 } }}
        expanded={open}
        onChange={
          locked
            ? undefined
            : (_, isExpanded) => {
                if (!controlled) setUncontrolledOpen(isExpanded);
                onChange?.(isExpanded);
              }
        }
      >
        <AccordionSummary expandIcon={locked ? undefined : <ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 400, flex: 1, minWidth: 0, pr: hasActions ? 10 : 0 }} noWrap>
            {label}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>{children}</AccordionDetails>
      </Accordion>
      {hasActions ? (
        <Box
          className="no-print"
          sx={{
            position: "absolute",
            top: 6,
            right: locked ? 8 : 50,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          {onAdd ? (
            <IconButton aria-label={`Add ${title}`} onClick={onAdd}>
              <AddIcon fontSize="small" />
            </IconButton>
          ) : null}
          {editHref ? (
            <IconButton
              component={Link}
              href={editHref}
              prefetch={false}
              aria-label={`Edit ${title}`}
              onClick={(event) => event.stopPropagation()}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          ) : null}
          {onEdit ? (
            <IconButton aria-label={`Edit ${title}`} onClick={onEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
