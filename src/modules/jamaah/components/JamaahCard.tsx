import React from 'react'
import { Jamaah } from '@/stores/jamaahStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/utils'

interface JamaahCardProps {
  jamaah: Jamaah
  onDelete: () => void
}

export function JamaahCard({ jamaah, onDelete }: JamaahCardProps) {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="space-y-3">
        <h3 className="font-semibold text-lg text-foreground">{jamaah.nama}</h3>

        {jamaah.email && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Email:</span> {jamaah.email}
          </div>
        )}

        {jamaah.noHp && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Telepon:</span> {jamaah.noHp}
          </div>
        )}

        {jamaah.statusKeluarga && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Status:</span> {jamaah.statusKeluarga}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Bergabung:</span> {formatDate(jamaah.createdAt)}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onDelete}>
            Hapus
          </Button>
        </div>
      </div>
    </Card>
  )
}
